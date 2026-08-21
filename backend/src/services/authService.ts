import { UserRepository } from '../repositories/userRepository.js'
import { verifyPassword } from '../db/passwordHash.js'
import type { IUserRepository } from '../repositories/userRepository.js'

// Mirrors tradeService.ts's ServiceError — duplicated rather than imported to keep the auth and
// trade domains decoupled (importing from tradeService.ts would pull in TradeRepository/
// broadcast at the type level for a trivial 3-line shape). Promote to a shared type only if a
// third service ever needs it.
export interface ServiceError {
  error: string
  code: number
}

const INVALID_CREDENTIALS: ServiceError = { error: 'invalid username or password', code: 401 }

// Business logic for login: validation, credential verification. Depends on IUserRepository via
// constructor injection (not the concrete UserRepository) so this can be unit tested with a
// fake, in-memory repository instead of a real MySQL connection.
export class AuthService {
  constructor(private repository: IUserRepository = new UserRepository()) {}

  // Looks up the user and verifies the password. Returns the SAME generic error/status for
  // "no such user" and "wrong password" — a single return statement covers both, so the two
  // cases can't accidentally end up with different messages later (that would let an attacker
  // enumerate valid usernames).
  async login(username: string, password: string): Promise<{ username: string } | ServiceError> {
    if (!username || typeof username !== 'string' || !password || typeof password !== 'string') {
      return { error: 'username and password are required', code: 400 }
    }

    const user = await this.repository.getByUsername(username)
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return INVALID_CREDENTIALS
    }

    return { username: user.username }
  }
}

export const authService = new AuthService()
