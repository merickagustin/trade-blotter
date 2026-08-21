import { describe, expect, it } from 'vitest'
import { TradeService, validateNewTrade } from '../../src/services/tradeService.js'
import type { ITradeRepository } from '../../src/repositories/tradeRepository.js'
import type { NewTrade, PositionSummary, SymbolPnl, Trade, TradeAmendment } from '../../src/models/trade.js'

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
    expect(validateNewTrade({ ...validTrade, quantity: 0 })).toBe('quantity must be a positive whole number')
    expect(validateNewTrade({ ...validTrade, quantity: -5 })).toBe('quantity must be a positive whole number')
  })

  it('rejects a non-integer quantity', () => {
    expect(validateNewTrade({ ...validTrade, quantity: 1.5 })).toBe('quantity must be a positive whole number')
  })

  it('rejects a non-positive price', () => {
    expect(validateNewTrade({ ...validTrade, price: 0 })).toBe('price must be a positive number')
  })

  it('rejects a missing trader', () => {
    expect(validateNewTrade({ ...validTrade, trader: '' })).toBe('trader is required')
  })

  it('accepts a missing book or counterparty — not required', () => {
    expect(validateNewTrade({ ...validTrade, book: '' })).toBeNull()
    expect(validateNewTrade({ ...validTrade, counterparty: '' })).toBeNull()
  })

  it('rejects a missing tradeTimestamp', () => {
    expect(validateNewTrade({ ...validTrade, tradeTimestamp: '' })).toBe('tradeTimestamp is required')
  })

  it('rejects a tradeTimestamp in the future', () => {
    const future = new Date(Date.now() + 60_000).toISOString()
    expect(validateNewTrade({ ...validTrade, tradeTimestamp: future })).toBe(
      'tradeTimestamp cannot be in the future',
    )
  })

  it('accepts a tradeTimestamp at or before now', () => {
    const now = new Date().toISOString()
    expect(validateNewTrade({ ...validTrade, tradeTimestamp: now })).toBeNull()
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

  async getPnlBySymbol(): Promise<SymbolPnl[]> {
    const bySymbol = new Map<string, { totalSellValue: number; totalBuyValue: number; netPosition: number }>()
    const latestBySymbol = new Map<string, Trade>()

    for (const trade of this.trades.values()) {
      if (trade.status !== 'ACTIVE') continue

      const totals = bySymbol.get(trade.symbol) ?? { totalSellValue: 0, totalBuyValue: 0, netPosition: 0 }
      const value = trade.quantity * trade.price
      if (trade.side === 'SELL') {
        totals.totalSellValue += value
        totals.netPosition -= trade.quantity
      } else {
        totals.totalBuyValue += value
        totals.netPosition += trade.quantity
      }
      bySymbol.set(trade.symbol, totals)

      // Map iteration is insertion order, so a later trade with an equal tradeTimestamp is
      // treated as "more recent" — mirrors the tradeId DESC tiebreak the real query uses.
      const current = latestBySymbol.get(trade.symbol)
      if (!current || trade.tradeTimestamp >= current.tradeTimestamp) {
        latestBySymbol.set(trade.symbol, trade)
      }
    }

    return [...bySymbol.entries()]
      .map(([symbol, totals]) => {
        const latestPrice = latestBySymbol.get(symbol)!.price
        const realizedPnl = totals.totalSellValue - totals.totalBuyValue
        const unrealizedPnl = totals.netPosition * latestPrice
        return { symbol, realizedPnl, unrealizedPnl, totalPnl: realizedPnl + unrealizedPnl, latestPrice }
      })
      .sort((a, b) => a.symbol.localeCompare(b.symbol))
  }
}

// Error cases from the controller
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

    // Create a BUY and a SELL for the same symbol, plus a cancelled trade for a different symbol. 
    // The net position should be 100 - 40 = 60 for AAPL, and MSFT should not appear because it was cancelled.
    const buy = await service.createTrade({ ...validTrade, symbol: 'AAPL', side: 'BUY', quantity: 100 })
    if ('error' in buy) throw new Error('setup failed: create should not fail')
    await service.createTrade({ ...validTrade, symbol: 'AAPL', side: 'SELL', quantity: 40 })

    const cancelled = await service.createTrade({ ...validTrade, symbol: 'MSFT', side: 'BUY', quantity: 500 })
    if ('error' in cancelled) throw new Error('setup failed: create should not fail')
    await service.cancelTrade(cancelled.tradeId)

    const positions = await service.getPositions()

    expect(positions).toEqual([{ symbol: 'AAPL', netQuantity: 60 }])
  })

  it('computes realized/unrealized/total P&L per symbol and excludes cancelled trades', async () => {
    const service = new TradeService(new FakeTradeRepository())

    // BUY 100 @ 150.5 = 15050 buy value, SELL 40 @ 160 = 6400 sell value.
    // realizedPnl = 6400 - 15050 = -8650. netPosition = 100 - 40 = 60.
    // Both trades share the same tradeTimestamp, so the tiebreak (created-later-wins) picks
    // the SELL (price 160) as "latest" → unrealizedPnl = 60 * 160 = 9600, totalPnl = 950.
    const buy = await service.createTrade({ ...validTrade, symbol: 'AAPL', side: 'BUY', quantity: 100, price: 150.5 })
    if ('error' in buy) throw new Error('setup failed: create should not fail')
    await service.createTrade({ ...validTrade, symbol: 'AAPL', side: 'SELL', quantity: 40, price: 160 })

    const cancelled = await service.createTrade({ ...validTrade, symbol: 'MSFT', side: 'SELL', quantity: 500, price: 300 })
    if ('error' in cancelled) throw new Error('setup failed: create should not fail')
    await service.cancelTrade(cancelled.tradeId)

    const pnl = await service.getPnlBySymbol()

    expect(pnl).toEqual([
      { symbol: 'AAPL', realizedPnl: -8650, unrealizedPnl: 9600, totalPnl: 950, latestPrice: 160 },
    ])
  })
})
