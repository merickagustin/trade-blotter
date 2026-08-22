import { Router } from 'express'
import * as tradeController from '../controllers/tradeController.js'

// Endpoint definitions for /api/trades — just path/method wired to a controller function, no
// logic here. See tradeController.ts for what each handler does, tradeService.ts for the
// business rules behind it.
export const tradesRouter = Router()

tradesRouter.get('/', tradeController.list)
tradesRouter.get('/positions', tradeController.positions)
tradesRouter.post('/', tradeController.create)
tradesRouter.patch('/:tradeId', tradeController.amend)
tradesRouter.get('/:tradeId/history', tradeController.history)
tradesRouter.post('/:tradeId/cancel', tradeController.cancel)
