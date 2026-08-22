import type { RowDataPacket } from '@trade-blotter/database'

export interface Trade {
  // Format: TRD-XXXXXX (e.g. TRD-000001) — minted by TradeRepository.create from trade_id_seq,
  // never assigned by the client. See database/src/schema.sql for how it's stored.
  tradeId: string
  symbol: string
  side: 'BUY' | 'SELL'
  quantity: number
  price: number
  trader: string
  book: string
  counterparty: string
  tradeTimestamp: string
  status: 'ACTIVE' | 'CANCELLED'
}

export type NewTrade = Omit<Trade, 'tradeId' | 'status'>

// Raw shape of a row from the `trades` table, before mapRow() converts it to a Trade (snake_case
// column, quantity/price come back from MySQL as strings). Lives here alongside Trade since it's
// the same data, just at the persistence boundary — repositories/tradeRepository.ts is the only
// place that constructs or consumes it.
export interface TradeRow extends RowDataPacket {
  tradeId: string
  symbol: string
  side: 'BUY' | 'SELL'
  quantity: string
  price: string
  trader: string
  book: string
  counterparty: string
  trade_timestamp: string
  status: 'ACTIVE' | 'CANCELLED'
}

// One row per successful amendment (PATCH /api/trades/:tradeId) — full before/after snapshots
// of the trade, not a field-level diff. Does not cover cancellations.
export interface TradeAmendment {
  id: number
  tradeId: string
  amendedAt: string
  before: Trade
  after: Trade
}

export interface TradeAmendmentRow extends RowDataPacket {
  id: number
  tradeId: string
  amended_at: string
  before_state: Trade
  after_state: Trade
}

// Net position per symbol, across ACTIVE trades only (BUY quantity minus SELL quantity).
// Cancelled trades never contribute. Computed on demand via SQL aggregation — not stored.
export interface PositionSummary {
  symbol: string
  netQuantity: number
}

export interface PositionRow extends RowDataPacket {
  symbol: string
  netQuantity: string
}
