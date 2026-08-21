import mysql from 'mysql2/promise'

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
