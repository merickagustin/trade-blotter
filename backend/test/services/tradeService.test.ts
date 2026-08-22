import { describe, expect, it } from 'vitest'
import { TradeService, validateNewTrade } from '../../src/services/tradeService.js'
import type { ITradeRepository } from '../../src/repositories/tradeRepository.js'
import type { NewTrade, PositionSummary, Trade, TradeAmendment } from '../../src/models/trade.js'

const validTrade = {
  symbol: 'AAPL',
  side: 'BUY' as const,
  quantity: 100,
  price: 150.5,
  trader: 'JSMITH',
  book: 'EQUITIES_US',
  counterparty: 'Goldman Sachs',
  tradeTimestamp: '2026-08-18T09:15:23Z',
}

describe('validateNewTrade', () => {
  it('accepts a fully valid trade', () => {
    expect(validateNewTrade(validTrade)).toBeNull()
  })

  it('rejects a missing symbol', () => {
    expect(validateNewTrade({ ...validTrade, symbol: '' })).toBe('symbol is required')
  })

  it('rejects a side that is not BUY or SELL', () => {
    // @ts-expect-error deliberately invalid input
    expect(validateNewTrade({ ...validTrade, side: 'HOLD' })).toBe('side must be BUY or SELL')
  })

  it('rejects a non-positive quantity', () => {
    expect(validateNewTrade({ ...validTrade, quantity: 0 })).toBe('quantity must be a positive number')
    expect(validateNewTrade({ ...validTrade, quantity: -5 })).toBe('quantity must be a positive number')
  })

  it('rejects a non-positive price', () => {
    expect(validateNewTrade({ ...validTrade, price: 0 })).toBe('price must be a positive number')
  })

  it('rejects a missing trader, book, or counterparty', () => {
    expect(validateNewTrade({ ...validTrade, trader: '' })).toBe('trader is required')
    expect(validateNewTrade({ ...validTrade, book: '' })).toBe('book is required')
    expect(validateNewTrade({ ...validTrade, counterparty: '' })).toBe('counterparty is required')
  })

  it('rejects a missing tradeTimestamp', () => {
    expect(validateNewTrade({ ...validTrade, tradeTimestamp: '' })).toBe('tradeTimestamp is required')
  })
})

// Hand-written in-memory fake — proves the DI point: business logic (guards) can be tested
// without a real MySQL connection.
class FakeTradeRepository implements ITradeRepository {
  private trades = new Map<string, Trade>()
  private amendments: TradeAmendment[] = []

  async getAll(): Promise<Trade[]> {
    return [...this.trades.values()]
  }

  async getById(tradeId: string): Promise<Trade | undefined> {
    return this.trades.get(tradeId)
  }

  async create(input: NewTrade): Promise<Trade> {
    const trade: Trade = { ...input, tradeId: `TRD-FAKE-${this.trades.size + 1}`, status: 'ACTIVE' }
    this.trades.set(trade.tradeId, trade)
    return trade
  }

  async update(tradeId: string, patch: Partial<NewTrade>): Promise<Trade | undefined> {
    const existing = this.trades.get(tradeId)
    if (!existing) return undefined
    const updated = { ...existing, ...patch }
    this.trades.set(tradeId, updated)
    this.amendments.unshift({
      id: this.amendments.length + 1,
      tradeId,
      amendedAt: new Date().toISOString(),
      before: existing,
      after: updated,
    })
    return updated
  }

  async cancel(tradeId: string): Promise<Trade | undefined> {
    const existing = this.trades.get(tradeId)
    if (!existing) return undefined
    const cancelled: Trade = { ...existing, status: 'CANCELLED' }
    this.trades.set(tradeId, cancelled)
    return cancelled
  }

  async getAmendments(tradeId: string): Promise<TradeAmendment[]> {
    return this.amendments.filter((amendment) => amendment.tradeId === tradeId)
  }

  async getPositions(): Promise<PositionSummary[]> {
    const netBySymbol = new Map<string, number>()
    for (const trade of this.trades.values()) {
      if (trade.status !== 'ACTIVE') continue
      const signedQuantity = trade.side === 'BUY' ? trade.quantity : -trade.quantity
      netBySymbol.set(trade.symbol, (netBySymbol.get(trade.symbol) ?? 0) + signedQuantity)
    }
    return [...netBySymbol.entries()]
      .map(([symbol, netQuantity]) => ({ symbol, netQuantity }))
      .sort((a, b) => a.symbol.localeCompare(b.symbol))
  }
}

describe('TradeService (with a fake repository)', () => {
  it('refuses to amend a cancelled trade', async () => {
    const service = new TradeService(new FakeTradeRepository())

    const created = await service.createTrade(validTrade)
    if ('error' in created) throw new Error('setup failed: create should not fail')

    await service.cancelTrade(created.tradeId)

    const result = await service.amendTrade(created.tradeId, { quantity: 999 })

    expect(result).toEqual({ error: 'cannot amend a cancelled trade', code: 409 })
  })

  it('returns 404 for history of an unknown trade', async () => {
    const service = new TradeService(new FakeTradeRepository())

    const result = await service.getTradeHistory('TRD-NOPE')

    expect(result).toEqual({ error: 'trade not found', code: 404 })
  })

  it('records a before/after snapshot for each amendment, most recent first', async () => {
    const service = new TradeService(new FakeTradeRepository())

    const created = await service.createTrade(validTrade)
    if ('error' in created) throw new Error('setup failed: create should not fail')

    await service.amendTrade(created.tradeId, { quantity: 200 })
    await service.amendTrade(created.tradeId, { quantity: 300 })

    const history = await service.getTradeHistory(created.tradeId)
    if ('error' in history) throw new Error('history lookup should not fail')

    expect(history).toHaveLength(2)
    expect(history[0].before.quantity).toBe(200)
    expect(history[0].after.quantity).toBe(300)
    expect(history[1].before.quantity).toBe(100)
    expect(history[1].after.quantity).toBe(200)
  })

  it('nets BUY/SELL quantity per symbol and excludes cancelled trades', async () => {
    const service = new TradeService(new FakeTradeRepository())

    const buy = await service.createTrade({ ...validTrade, symbol: 'AAPL', side: 'BUY', quantity: 100 })
    if ('error' in buy) throw new Error('setup failed: create should not fail')
    await service.createTrade({ ...validTrade, symbol: 'AAPL', side: 'SELL', quantity: 40 })

    const cancelled = await service.createTrade({ ...validTrade, symbol: 'MSFT', side: 'BUY', quantity: 500 })
    if ('error' in cancelled) throw new Error('setup failed: create should not fail')
    await service.cancelTrade(cancelled.tradeId)

    const positions = await service.getPositions()

    expect(positions).toEqual([{ symbol: 'AAPL', netQuantity: 60 }])
  })
})
