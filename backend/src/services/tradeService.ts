import { TradeRepository } from '../repositories/tradeRepository.js'
import { broadcast } from '../ws/server.js'
import type { ITradeRepository } from '../repositories/tradeRepository.js'
import type { NewTrade, PositionSummary, SymbolPnl, Trade, TradeAmendment } from '../models/trade.js'

// Result shape for operations that can fail for a business reason (not found, invalid input,
// already cancelled). Controllers check `'error' in result` and map `code` straight to the
// HTTP status — no thrown exceptions/error classes, kept as the simple style used elsewhere.
export interface ServiceError {
  error: string
  code: number
}

export function validateNewTrade(body: Partial<NewTrade>): string | null {
  if (!body.symbol || typeof body.symbol !== 'string') return 'symbol is required'
  if (body.side !== 'BUY' && body.side !== 'SELL') return 'side must be BUY or SELL'
  if (typeof body.quantity !== 'number' || !Number.isInteger(body.quantity) || body.quantity <= 0)
    return 'quantity must be a positive whole number'
  if (typeof body.price !== 'number' || body.price <= 0) return 'price must be a positive number'
  if (!body.trader || typeof body.trader !== 'string') return 'trader is required'
  if (!body.tradeTimestamp || typeof body.tradeTimestamp !== 'string') return 'tradeTimestamp is required'
  if (new Date(body.tradeTimestamp).getTime() > Date.now()) return 'tradeTimestamp cannot be in the future'
  return null
}

// Business logic for trades: validation, cancelled-trade guards, and orchestrating the
// repository + broadcast(). Depends on ITradeRepository via constructor injection (not the
// concrete TradeRepository) so this can be unit tested with a fake, in-memory repository
// instead of a real MySQL connection.
export class TradeService {
  constructor(private repository: ITradeRepository = new TradeRepository()) {}

  async listTrades(): Promise<Trade[]> {
    return this.repository.getAll()
  }

  // Validates, creates, and broadcasts the new trade to connected clients.
  async createTrade(input: Partial<NewTrade>): Promise<Trade | ServiceError> {
    const error = validateNewTrade(input)
    if (error) return { error, code: 400 }

    const trade = await this.repository.create(input as NewTrade)
    broadcast({ type: 'created', trade })
    return trade
  }

  // Amends an existing active trade's fields and broadcasts the update.
  async amendTrade(tradeId: string, patch: Partial<NewTrade>): Promise<Trade | ServiceError> {
    const existing = await this.repository.getById(tradeId)
    if (!existing) return { error: 'trade not found', code: 404 }
    if (existing.status === 'CANCELLED') return { error: 'cannot amend a cancelled trade', code: 409 }

    const merged = { ...existing, ...patch }
    const error = validateNewTrade(merged)
    if (error) return { error, code: 400 }

    const trade = await this.repository.update(tradeId, patch)
    if (!trade) return { error: 'trade not found', code: 404 }

    broadcast({ type: 'amended', trade })
    return trade
  }

  // Cancels an active trade and broadcasts the status change.
  async cancelTrade(tradeId: string): Promise<Trade | ServiceError> {
    const existing = await this.repository.getById(tradeId)
    if (!existing) return { error: 'trade not found', code: 404 }
    if (existing.status === 'CANCELLED') return { error: 'trade is already cancelled', code: 409 }

    const trade = await this.repository.cancel(tradeId)
    if (!trade) return { error: 'trade not found', code: 404 }

    broadcast({ type: 'cancelled', trade })
    return trade
  }

  // Amendment history for a trade (before/after snapshots), most recent first.
  async getTradeHistory(tradeId: string): Promise<TradeAmendment[] | ServiceError> {
    const existing = await this.repository.getById(tradeId)
    if (!existing) return { error: 'trade not found', code: 404 }

    return this.repository.getAmendments(tradeId)
  }

  async getPositions(): Promise<PositionSummary[]> {
    return this.repository.getPositions()
  }

  async getPnlBySymbol(): Promise<SymbolPnl[]> {
    return this.repository.getPnlBySymbol()
  }
}

export const tradeService = new TradeService()
