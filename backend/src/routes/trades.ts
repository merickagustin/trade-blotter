import { Router } from 'express'
import type { NewTrade } from '../models/trade.js'
import { TradeStore } from '../models/tradeStore.js'
import { broadcast } from '../ws/server.js'

export const tradesRouter = Router()

function validateNewTrade(body: Partial<NewTrade>): string | null {
  if (!body.symbol || typeof body.symbol !== 'string') return 'symbol is required'
  if (body.side !== 'BUY' && body.side !== 'SELL') return 'side must be BUY or SELL'
  if (typeof body.quantity !== 'number' || body.quantity <= 0) return 'quantity must be a positive number'
  if (typeof body.price !== 'number' || body.price <= 0) return 'price must be a positive number'
  if (!body.trader || typeof body.trader !== 'string') return 'trader is required'
  if (!body.tradeTimestamp || typeof body.tradeTimestamp !== 'string') return 'tradeTimestamp is required'
  return null
}

tradesRouter.get('/', async (_req, res) => {
  res.json(await TradeStore.getAll())
})

tradesRouter.post('/', async (req, res) => {
  const error = validateNewTrade(req.body)
  if (error) {
    res.status(400).json({ error })
    return
  }
  const trade = await TradeStore.create(req.body as NewTrade)
  broadcast({ type: 'created', trade })
  res.status(201).json(trade)
})

tradesRouter.patch('/:tradeId', async (req, res) => {
  const existing = await TradeStore.getById(req.params.tradeId)
  if (!existing) {
    res.status(404).json({ error: 'trade not found' })
    return
  }
  if (existing.status === 'CANCELLED') {
    res.status(409).json({ error: 'cannot amend a cancelled trade' })
    return
  }

  const patch = { ...existing, ...req.body }
  const error = validateNewTrade(patch)
  if (error) {
    res.status(400).json({ error })
    return
  }

  const trade = await TradeStore.update(req.params.tradeId, req.body as Partial<NewTrade>)
  broadcast({ type: 'amended', trade })
  res.json(trade)
})

tradesRouter.post('/:tradeId/cancel', async (req, res) => {
  const existing = await TradeStore.getById(req.params.tradeId)
  if (!existing) {
    res.status(404).json({ error: 'trade not found' })
    return
  }
  if (existing.status === 'CANCELLED') {
    res.status(409).json({ error: 'trade is already cancelled' })
    return
  }

  const trade = await TradeStore.cancel(req.params.tradeId)
  broadcast({ type: 'cancelled', trade })
  res.json(trade)
})
