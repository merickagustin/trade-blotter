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

export const sampleTrade: Trade = {
  id: '1',
  symbol: 'AAPL',
  quantity: 100,
  price: 150.0,
  side: 'BUY',
  trader: 'John Doe',
  tradeDate: '2023-10-01T10:00:00Z',
  status: 'ACTIVE',
}

export type NewTrade = Omit<Trade, 'id' | 'status'>
