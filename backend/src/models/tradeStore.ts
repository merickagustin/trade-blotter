import { getPool } from '@trade-blotter/database'
import type { ResultSetHeader, RowDataPacket } from '@trade-blotter/database'
import type { NewTrade, Trade } from './trade.js'

interface TradeRow extends RowDataPacket {
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

export function toMysqlDatetime(iso: string): string {
  return new Date(iso).toISOString().slice(0, 19).replace('T', ' ')
}

function toIsoTimestamp(mysqlDatetime: string): string {
  return `${mysqlDatetime.replace(' ', 'T')}Z`
}

function mapRow(row: TradeRow): Trade {
  return {
    tradeId: row.tradeId,
    symbol: row.symbol,
    side: row.side,
    quantity: Number(row.quantity),
    price: Number(row.price),
    trader: row.trader,
    book: row.book,
    counterparty: row.counterparty,
    tradeTimestamp: toIsoTimestamp(row.trade_timestamp),
    status: row.status,
  }
}

// Repository for the `trades` table — the only place in the backend that talks SQL. Routes
// call this for all reads/writes instead of querying the pool directly; business rules (like
// blocking amend/cancel on an already-cancelled trade) live in the route handlers, not here.
export const TradeStore = {
  async getAll(): Promise<Trade[]> {
    const [rows] = await getPool().query<TradeRow[]>('SELECT * FROM trades ORDER BY trade_timestamp DESC, tradeId')
    return rows.map(mapRow)
  },

  async getById(tradeId: string): Promise<Trade | undefined> {
    const [rows] = await getPool().query<TradeRow[]>('SELECT * FROM trades WHERE tradeId = ?', [tradeId])
    return rows[0] ? mapRow(rows[0]) : undefined
  },

  async create(input: NewTrade): Promise<Trade> {
    const [seq] = await getPool().query<ResultSetHeader>('INSERT INTO trade_id_seq (seq_id) VALUES (NULL)')
    const tradeId = `TRD-${String(seq.insertId).padStart(6, '0')}`

    await getPool().query(
      'INSERT INTO trades (tradeId, symbol, side, quantity, price, trader, book, counterparty, trade_timestamp, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        tradeId,
        input.symbol,
        input.side,
        input.quantity,
        input.price,
        input.trader,
        input.book,
        input.counterparty,
        toMysqlDatetime(input.tradeTimestamp),
        'ACTIVE',
      ],
    )
    return { ...input, tradeId, status: 'ACTIVE' }
  },

  async update(tradeId: string, patch: Partial<NewTrade>): Promise<Trade | undefined> {
    const existing = await TradeStore.getById(tradeId)
    if (!existing) return undefined

    const updated = { ...existing, ...patch }
    await getPool().query(
      'UPDATE trades SET symbol = ?, side = ?, quantity = ?, price = ?, trader = ?, book = ?, counterparty = ?, trade_timestamp = ? WHERE tradeId = ?',
      [
        updated.symbol,
        updated.side,
        updated.quantity,
        updated.price,
        updated.trader,
        updated.book,
        updated.counterparty,
        toMysqlDatetime(updated.tradeTimestamp),
        tradeId,
      ],
    )
    return updated
  },

  async cancel(tradeId: string): Promise<Trade | undefined> {
    const existing = await TradeStore.getById(tradeId)
    if (!existing) return undefined

    await getPool().query('UPDATE trades SET status = ? WHERE tradeId = ?', ['CANCELLED', tradeId])
    return { ...existing, status: 'CANCELLED' }
  },
}
