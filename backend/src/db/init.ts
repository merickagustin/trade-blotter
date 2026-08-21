import { initSchema, pool } from '@trade-blotter/database'
import type { RowDataPacket } from '@trade-blotter/database'
import { sampleTrade } from '../models/trade.js'

interface CountRow extends RowDataPacket {
  count: number
}

export async function initDb(): Promise<void> {
  await initSchema()

  const [rows] = await pool.query<CountRow[]>('SELECT COUNT(*) AS count FROM trades')
  if (rows[0].count > 0) return

  await pool.query(
    'INSERT INTO trades (symbol, quantity, price, side, trader, trade_date, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      sampleTrade.symbol,
      sampleTrade.quantity,
      sampleTrade.price,
      sampleTrade.side,
      sampleTrade.trader,
      sampleTrade.tradeDate.slice(0, 10),
      sampleTrade.status,
    ],
  )
}
