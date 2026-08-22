import { readFileSync } from 'node:fs'
import { getPool } from './pool.js'

const schemaPath = new URL('./schema.sql', import.meta.url)

// Creates/updates the `trades` and `trade_id_seq` tables from schema.sql (both statements are
// CREATE TABLE IF NOT EXISTS, so this is safe to run every time the server starts). Runs each
// statement separately because the pool has multipleStatements disabled — that's a mysql2
// safety default, and splitting here avoids weakening it for the pool's regular app queries.
export async function initSchema(): Promise<void> {
  const schema = readFileSync(schemaPath, 'utf8')
  const statements = schema
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean)

  for (const statement of statements) {
    await getPool().query(statement)
  }
}
