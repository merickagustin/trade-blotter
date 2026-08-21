import { Router } from 'express'
import * as authController from '../controllers/authController.js'

// Endpoint definitions for /api/auth — just path/method wired to a controller function, no
// logic here. See authController.ts for what the handler does, authService.ts for the rules.
export const authRouter = Router()

authRouter.post('/login', authController.login)
