import { pool } from '@trade-blotter/database'
import type { ResultSetHeader, RowDataPacket } from '@trade-blotter/database'
import type { NewTrade, Trade } from './trade.js'

interface TradeRow extends RowDataPacket {
  id: string
  symbol: string
  quantity: string
  price: string
  side: 'BUY' | 'SELL'
  trader: string
  trade_date: string
  status: 'ACTIVE' | 'CANCELLED'
}

function mapRow(row: TradeRow): Trade {
  return {
    id: row.id,
    symbol: row.symbol,
    quantity: Number(row.quantity),
    price: Number(row.price),
    side: row.side,
    trader: row.trader,
    tradeDate: row.trade_date,
    status: row.status,
  }
}

export const TradeStore = {
  async getAll(): Promise<Trade[]> {
    const [rows] = await pool.query<TradeRow[]>('SELECT * FROM trades ORDER BY trade_date DESC, id')
    return rows.map(mapRow)
  },

  async getById(id: string): Promise<Trade | undefined> {
    const [rows] = await pool.query<TradeRow[]>('SELECT * FROM trades WHERE id = ?', [id])
    return rows[0] ? mapRow(rows[0]) : undefined
  },

  async create(input: NewTrade): Promise<Trade> {
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO trades (symbol, quantity, price, side, trader, trade_date, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [input.symbol, input.quantity, input.price, input.side, input.trader, input.tradeDate, 'ACTIVE'],
    )
    const id = `TRD-${String(result.insertId).padStart(6, '0')}`
    return { ...input, id, status: 'ACTIVE' }
  },

  async update(id: string, patch: Partial<NewTrade>): Promise<Trade | undefined> {
    const existing = await TradeStore.getById(id)
    if (!existing) return undefined

    const updated = { ...existing, ...patch }
    await pool.query(
      'UPDATE trades SET symbol = ?, quantity = ?, price = ?, side = ?, trader = ?, trade_date = ? WHERE id = ?',
      [updated.symbol, updated.quantity, updated.price, updated.side, updated.trader, updated.tradeDate, id],
    )
    return updated
  },

  async cancel(id: string): Promise<Trade | undefined> {
    const existing = await TradeStore.getById(id)
    if (!existing) return undefined

    await pool.query('UPDATE trades SET status = ? WHERE id = ?', ['CANCELLED', id])
    return { ...existing, status: 'CANCELLED' }
  },
}
