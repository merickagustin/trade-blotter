import { ensureDatabase, initSchema } from '@trade-blotter/database'

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
      return
    } catch (err) {
      if (attempt === maxAttempts) throw err
      console.warn(`Database not ready yet (attempt ${attempt}/${maxAttempts}), retrying in 2s...`)
      await sleep(2000)
    }
  }
}
