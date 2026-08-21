import type { Request, Response } from 'express'
import { authService } from '../services/authService.js'

// POST /api/auth/login
export async function login(req: Request, res: Response): Promise<void> {
  const { username, password } = req.body as { username?: string; password?: string }
  const result = await authService.login(username ?? '', password ?? '')
  if ('error' in result) {
    res.status(result.code).json({ error: result.error })
    return
  }
  res.json(result)
}
