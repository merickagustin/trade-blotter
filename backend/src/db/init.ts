import { getPool, ensureDatabase, initSchema } from '@trade-blotter/database'
import type { RowDataPacket } from '@trade-blotter/database'
import { TradeStore } from '../models/tradeStore.js'
import { generateSeedTrades } from './seedData.js'

interface CountRow extends RowDataPacket {
  count: number
}

const SEED_COUNT = 500
const CANCELLED_RATIO = 0.15

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Called once at server startup to get the database ready: connects to MySQL, creates the
// `trade_blotter` database if it doesn't exist yet (ensureDatabase), then creates/updates the
// `trades` and `trade_id_seq` tables to match the current schema (initSchema).
//
// Retries on failure because in Docker Compose, MySQL's official image restarts itself
// internally during first-time initialization — there's a brief window right after the
// healthcheck passes where it isn't actually accepting connections yet. Without retrying here,
// that race would crash the backend on startup (see initDb's caller in index.ts, which exits
// the process if this ultimately fails).
export async function initDb(): Promise<void> {
  const maxAttempts = 10

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await ensureDatabase()
      await initSchema()
      await seedIfEmpty()
      return
    } catch (err) {
      if (attempt === maxAttempts) throw err
      console.warn(`Database not ready yet (attempt ${attempt}/${maxAttempts}), retrying in 2s...`)
      await sleep(2000)
    }
  }
}

// One-time seed of realistic randomized trades so the blotter isn't empty on a fresh database.
// Goes through TradeStore.create/cancel (the same path real trades take) rather than a separate
// bulk-insert, so seeded rows get real sequential tradeIds and behave exactly like user-created
// ones. Only runs when the table is genuinely empty, so restarts never duplicate it.
async function seedIfEmpty(): Promise<void> {
  const [rows] = await getPool().query<CountRow[]>('SELECT COUNT(*) AS count FROM trades')
  if (rows[0].count > 0) return

  const trades = await Promise.all(generateSeedTrades(SEED_COUNT).map((trade) => TradeStore.create(trade)))

  const toCancel = trades.filter(() => Math.random() < CANCELLED_RATIO)
  await Promise.all(toCancel.map((trade) => TradeStore.cancel(trade.tradeId)))

  console.log(`Seeded ${trades.length} trades (${toCancel.length} cancelled).`)
}
