import { readFileSync } from 'node:fs'
import { pool } from './pool.js'

const schemaPath = new URL('./schema.sql', import.meta.url)

export async function initSchema(): Promise<void> {
  const schema = readFileSync(schemaPath, 'utf8')
  await pool.query(schema)
}
