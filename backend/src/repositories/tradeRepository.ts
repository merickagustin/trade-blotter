import { getPool } from '@trade-blotter/database'
import type { ResultSetHeader } from '@trade-blotter/database'
import type {
  NewTrade,
  PnlRow,
  PositionRow,
  PositionSummary,
  SymbolPnl,
  Trade,
  TradeAmendment,
  TradeAmendmentRow,
  TradeRow,
} from '../models/trade.js'

export function toMysqlDatetime(iso: string): string {
  return new Date(iso).toISOString().slice(0, 19).replace('T', ' ')
}

export function toIsoTimestamp(mysqlDatetime: string): string {
  return `${mysqlDatetime.slice(0, 19).replace(' ', 'T')}Z`
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

export interface ITradeRepository {
  getAll(): Promise<Trade[]>
  getById(tradeId: string): Promise<Trade | undefined>
  create(input: NewTrade): Promise<Trade>
  update(tradeId: string, patch: Partial<NewTrade>): Promise<Trade | undefined>
  cancel(tradeId: string): Promise<Trade | undefined>
  getAmendments(tradeId: string): Promise<TradeAmendment[]>
  getPositions(): Promise<PositionSummary[]>
  getPnlBySymbol(): Promise<SymbolPnl[]>
}

// Repository for the `trades` table — the only place in the backend that talks SQL. The
// service layer depends on this via the ITradeRepository interface (constructor injection),
// not this concrete class directly, so business logic can be unit tested against a fake
// implementation instead of a real MySQL connection. Business rules (like blocking amend/cancel
// on an already-cancelled trade) live in services/tradeService.ts, not here.
export class TradeRepository implements ITradeRepository {
  async getAll(): Promise<Trade[]> {
    const [rows] = await getPool().query<TradeRow[]>('SELECT * FROM trades ORDER BY trade_timestamp DESC, tradeId')
    return rows.map(mapRow)
  }

  async getById(tradeId: string): Promise<Trade | undefined> {
    const [rows] = await getPool().query<TradeRow[]>('SELECT * FROM trades WHERE tradeId = ?', [tradeId])
    return rows[0] ? mapRow(rows[0]) : undefined
  }

  async create(input: NewTrade): Promise<Trade> {
    const [seq] = await getPool().query<ResultSetHeader>('INSERT INTO trade_id_seq (seq_id) VALUES (NULL)')
    const tradeId = `TRD-${String(seq.insertId).padStart(6, '0')}`
    const tradeTimestamp = toMysqlDatetime(input.tradeTimestamp)

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
        tradeTimestamp,
        'ACTIVE',
      ],
    )
    return { ...input, tradeId, tradeTimestamp: toIsoTimestamp(tradeTimestamp), status: 'ACTIVE' }
  }

  async update(tradeId: string, patch: Partial<NewTrade>): Promise<Trade | undefined> {
    const existing = await this.getById(tradeId)
    if (!existing) return undefined

    const merged = { ...existing, ...patch }
    const tradeTimestamp = toMysqlDatetime(merged.tradeTimestamp)
    const updated = { ...merged, tradeTimestamp: toIsoTimestamp(tradeTimestamp) }
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
        tradeTimestamp,
        tradeId,
      ],
    )

    await getPool().query(
      'INSERT INTO audit_trade_amendments (tradeId, amended_at, before_state, after_state) VALUES (?, ?, ?, ?)',
      [tradeId, toMysqlDatetime(new Date().toISOString()), JSON.stringify(existing), JSON.stringify(updated)],
    )

    return updated
  }

  async cancel(tradeId: string): Promise<Trade | undefined> {
    const existing = await this.getById(tradeId)
    if (!existing) return undefined

    await getPool().query('UPDATE trades SET status = ? WHERE tradeId = ?', ['CANCELLED', tradeId])
    return { ...existing, status: 'CANCELLED' }
  }

  // Amendment history for a trade, most recent first. Empty array if the trade has never been
  // amended (never throws for an unknown tradeId — that's the caller's job to check via getById).
  async getAmendments(tradeId: string): Promise<TradeAmendment[]> {
    const [rows] = await getPool().query<TradeAmendmentRow[]>(
      'SELECT * FROM audit_trade_amendments WHERE tradeId = ? ORDER BY id DESC',
      [tradeId],
    )
    return rows.map((row) => ({
      id: row.id,
      tradeId: row.tradeId,
      amendedAt: toIsoTimestamp(row.amended_at),
      before: row.before_state,
      after: row.after_state,
    }))
  }

  // Net position per symbol (BUY quantity minus SELL quantity) across ACTIVE trades only.
  // Symbols that net to zero are still included — no special-casing.
  async getPositions(): Promise<PositionSummary[]> {
    const [rows] = await getPool().query<PositionRow[]>(
      `SELECT symbol, SUM(CASE WHEN side = 'BUY' THEN quantity ELSE -quantity END) AS netQuantity
       FROM trades WHERE status = 'ACTIVE' GROUP BY symbol ORDER BY symbol`,
    )
    return rows.map((row) => ({ symbol: row.symbol, netQuantity: Number(row.netQuantity) }))
  }

  // Realized/unrealized/total P&L per symbol, across ACTIVE trades only — see SymbolPnl for
  // the formula. Two CTEs, joined by symbol:
  //   aggregates — one row per symbol, cash-flow totals over every ACTIVE trade:
  //     totalSellValue = SUM(quantity * price) for SELLs only
  //     totalBuyValue  = SUM(quantity * price) for BUYs only
  //     netPosition    = SUM(+quantity for BUY, -quantity for SELL)  (same calc as getPositions())
  //   latest — one row per symbol, the price of whichever ACTIVE trade is most recent, picked
  //     via ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY trade_timestamp DESC, tradeId DESC)
  //     and keeping rn = 1 (tiebreak tradeId DESC — same convention as getAll()).
  // Final SELECT combines them per symbol:
  //   realizedPnl   = totalSellValue - totalBuyValue        (cash actually locked in)
  //   unrealizedPnl = netPosition * latestPrice              (paper gain/loss on what's still open)
  //   totalPnl      = realizedPnl + unrealizedPnl
  async getPnlBySymbol(): Promise<SymbolPnl[]> {
    const [rows] = await getPool().query<PnlRow[]>(
      `WITH aggregates AS (
         SELECT
           symbol,
           SUM(CASE WHEN side = 'SELL' THEN quantity * price ELSE 0 END) AS totalSellValue,
           SUM(CASE WHEN side = 'BUY' THEN quantity * price ELSE 0 END) AS totalBuyValue,
           SUM(CASE WHEN side = 'BUY' THEN quantity ELSE -quantity END) AS netPosition
         FROM trades
         WHERE status = 'ACTIVE'
         GROUP BY symbol
       ),
       latest AS (
         SELECT symbol, price AS latestPrice
         FROM (
           SELECT
             symbol,
             price,
             ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY trade_timestamp DESC, tradeId DESC) AS rn
           FROM trades
           WHERE status = 'ACTIVE'
         ) ranked
         WHERE rn = 1
       )
       SELECT
         aggregates.symbol,
         (aggregates.totalSellValue - aggregates.totalBuyValue) AS realizedPnl,
         (aggregates.netPosition * latest.latestPrice) AS unrealizedPnl,
         (aggregates.totalSellValue - aggregates.totalBuyValue)
           + (aggregates.netPosition * latest.latestPrice) AS totalPnl,
         latest.latestPrice AS latestPrice
       FROM aggregates
       JOIN latest ON latest.symbol = aggregates.symbol
       ORDER BY aggregates.symbol`,
    )
    return rows.map((row) => ({
      symbol: row.symbol,
      realizedPnl: Number(row.realizedPnl),
      unrealizedPnl: Number(row.unrealizedPnl),
      totalPnl: Number(row.totalPnl),
      latestPrice: Number(row.latestPrice),
    }))
  }
}
