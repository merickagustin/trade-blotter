export interface Trade {
  // Format: TRD-XXXXXX (e.g. TRD-000001) — minted by TradeStore.create from trade_id_seq,
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
