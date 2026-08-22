import { ensureDatabase, initSchema } from '@trade-blotter/database'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

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
