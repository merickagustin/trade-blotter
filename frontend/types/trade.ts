export interface Trade {
  id: string
  symbol: string
  quantity: number
  price: number
  side: 'BUY' | 'SELL'
  trader: string
  tradeDate: string
  status: 'ACTIVE' | 'CANCELLED'
}

export type NewTrade = Omit<Trade, 'id' | 'status'>
