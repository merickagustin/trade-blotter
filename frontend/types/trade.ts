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

export interface TradeBlotterProps {
  trades: Trade[]
  onCreate: () => void
  onAmend: (trade: Trade) => void
  onCancel: (trade: Trade) => void
}

export interface TradeFormModalProps {
  mode: 'create' | 'amend'
  initialTrade?: Trade | null
  onClose: () => void
  onSubmit: (data: NewTrade) => Promise<void>
}
