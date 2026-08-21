import { getPool, ensureDatabase, initSchema } from '@trade-blotter/database'
import type { RowDataPacket } from '@trade-blotter/database'
import { TradeRepository } from '../repositories/tradeRepository.js'
import { generateSeedTrades, TRADERS } from './seedData.js'
import { hashPassword } from './passwordHash.js'

interface CountRow extends RowDataPacket {
  count: number
}

const SEED_COUNT = 500
const CANCELLED_RATIO = 0.15

// Demo-only default password for every seeded account — there's no login endpoint yet to
// change it, so this is purely a placeholder for once one exists.
const SEED_PASSWORD = 'password123'

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
      await seedUsersIfEmpty()
      return
    } catch (err) {
      if (attempt === maxAttempts) throw err
      console.warn(`Database not ready yet (attempt ${attempt}/${maxAttempts}), retrying in 2s...`)
      await sleep(2000)
    }
  }
}

// One-time seed of realistic randomized trades so the blotter isn't empty on a fresh database.
// Goes through TradeRepository.create/cancel directly (bypassing the service layer's validation
// and broadcast — seeding is infrastructure, not a user-facing action), so seeded rows still
// get real sequential tradeIds. Only runs when the table is genuinely empty, so restarts never
// duplicate it.
async function seedIfEmpty(): Promise<void> {
  const [rows] = await getPool().query<CountRow[]>('SELECT COUNT(*) AS count FROM trades')
  if (rows[0].count > 0) return

  const repository = new TradeRepository()
  const trades = await Promise.all(generateSeedTrades(SEED_COUNT).map((trade) => repository.create(trade)))

  const toCancel = trades.filter(() => Math.random() < CANCELLED_RATIO)
  await Promise.all(toCancel.map((trade) => repository.cancel(trade.tradeId)))

  console.log(`Seeded ${trades.length} trades (${toCancel.length} cancelled).`)
}

// One-time seed of a login account for every trader referenced by seeded trades, all sharing
// SEED_PASSWORD (demo data only). Only runs when the table is genuinely empty, same guard as
// seedIfEmpty above.
async function seedUsersIfEmpty(): Promise<void> {
  const [rows] = await getPool().query<CountRow[]>('SELECT COUNT(*) AS count FROM users')
  if (rows[0].count > 0) return

  for (const username of TRADERS) {
    const hash = hashPassword(SEED_PASSWORD)
    await getPool().query('INSERT INTO users (username, password_hash) VALUES (?, ?)', [username, hash])
  }

  console.log(`Seeded ${TRADERS.length} users.`)
}
