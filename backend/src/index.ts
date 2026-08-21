import cors from 'cors'
import express from 'express'
import { initDb } from './db/init.js'
import { tradesRouter } from './routes/trades.js'

try {
  process.loadEnvFile('.env')
} catch {
  // no .env file present — fall back to whatever's already in the environment
}

const app = express()
const port = process.env.PORT ?? 3001

app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/trades', tradesRouter)

initDb()
  .then(() => {
    app.listen(port, () => {
      console.log(`API listening on http://localhost:${port}`)
    })
  })
  .catch((err: unknown) => {
    console.error('Failed to initialize database:', err)
    process.exit(1)
  })
