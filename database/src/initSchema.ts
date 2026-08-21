import { readFileSync } from 'node:fs'
import { getPool } from './pool.js'

const schemaPath = new URL('./schema.sql', import.meta.url)

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
