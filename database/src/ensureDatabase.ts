import mysql from 'mysql2/promise'

// Creates the target database (e.g. trade_blotter) if it doesn't exist yet. Uses a temporary
// connection with no `database` selected, since the main pool (getPool) pins its connections
// to DB_NAME and would fail to connect at all if that database isn't there yet.
export async function ensureDatabase(): Promise<void> {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
  })
  const dbName = process.env.DB_NAME ?? 'trade_blotter'
  await connection.query(`CREATE DATABASE IF NOT EXISTS ${mysql.escapeId(dbName)}`)
  await connection.end()
}
