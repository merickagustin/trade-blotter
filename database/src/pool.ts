import mysql from 'mysql2/promise'
import type { Pool } from 'mysql2/promise'

let pool: Pool | undefined

// Lazily creates and caches the MySQL connection pool, configured from DB_* env vars. Lazy on
// purpose: ES module imports run before any application code, so if the pool were created at
// module load time, it would read process.env before .env has been loaded (see index.ts),
// silently picking up stale/default credentials. Calling getPool() defers that read until the
// first actual query, by which point .env is guaranteed to be loaded.
export function getPool(): Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 3306),
      user: process.env.DB_USER ?? 'root',
      password: process.env.DB_PASSWORD ?? '',
      database: process.env.DB_NAME ?? 'trade_blotter',
      waitForConnections: true,
      connectionLimit: 10,
      dateStrings: true,
    })
  }
  return pool
}
