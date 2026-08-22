import type { Request, Response } from 'express'
import { tradeService } from '../services/tradeService.js'
import type { NewTrade } from '../models/trade.js'

// GET /api/trades — list every trade for the blotter grid.
export async function list(_req: Request, res: Response): Promise<void> {
  res.json(await tradeService.listTrades())
}

// POST /api/trades — create a new trade.
export async function create(req: Request, res: Response): Promise<void> {
  const result = await tradeService.createTrade(req.body as Partial<NewTrade>)
  if ('error' in result) {
    res.status(result.code).json({ error: result.error })
    return
  }
  res.status(201).json(result)
}

// PATCH /api/trades/:tradeId — amend an existing active trade's fields.
export async function amend(req: Request<{ tradeId: string }>, res: Response): Promise<void> {
  const result = await tradeService.amendTrade(req.params.tradeId, req.body as Partial<NewTrade>)
  if ('error' in result) {
    res.status(result.code).json({ error: result.error })
    return
  }
  res.json(result)
}

// POST /api/trades/:tradeId/cancel — cancel an active trade.
export async function cancel(req: Request<{ tradeId: string }>, res: Response): Promise<void> {
  const result = await tradeService.cancelTrade(req.params.tradeId)
  if ('error' in result) {
    res.status(result.code).json({ error: result.error })
    return
  }
  res.json(result)
}

// GET /api/trades/:tradeId/history — amendment history for a trade, most recent first.
export async function history(req: Request<{ tradeId: string }>, res: Response): Promise<void> {
  const result = await tradeService.getTradeHistory(req.params.tradeId)
  if ('error' in result) {
    res.status(result.code).json({ error: result.error })
    return
  }
  res.json(result)
}

// GET /api/trades/positions — net position per symbol (ACTIVE trades only).
export async function positions(_req: Request, res: Response): Promise<void> {
  res.json(await tradeService.getPositions())
}
