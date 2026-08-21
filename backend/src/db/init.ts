import { ensureDatabase, initSchema } from '@trade-blotter/database'

export async function initDb(): Promise<void> {
  await ensureDatabase()
  await initSchema()
}
