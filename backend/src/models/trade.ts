export interface Trade {
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
