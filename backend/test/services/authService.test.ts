import { describe, expect, it } from 'vitest'
import { AuthService } from '../../src/services/authService.js'
import { hashPassword } from '../../src/db/passwordHash.js'
import type { IUserRepository } from '../../src/repositories/userRepository.js'
import type { UserCredentials } from '../../src/models/user.js'

// Hand-written in-memory fake — mirrors FakeTradeRepository in tradeService.test.ts. seed()
// calls the real hashPassword so verifyPassword is exercised for real, not mocked.
class FakeUserRepository implements IUserRepository {
  private users = new Map<string, UserCredentials>()

  seed(username: string, password: string): void {
    this.users.set(username, { username, passwordHash: hashPassword(password) })
  }

  async getByUsername(username: string): Promise<UserCredentials | undefined> {
    return this.users.get(username)
  }
}

describe('AuthService', () => {
  it('logs in with a correct username/password', async () => {
    const repository = new FakeUserRepository()
    repository.seed('JSMITH', 'password123')

    const result = await new AuthService(repository).login('JSMITH', 'password123')

    expect(result).toEqual({ username: 'JSMITH' })
  })

  it('rejects a wrong password with the generic error', async () => {
    const repository = new FakeUserRepository()
    repository.seed('JSMITH', 'password123')

    const result = await new AuthService(repository).login('JSMITH', 'wrongpassword')

    expect(result).toEqual({ error: 'invalid username or password', code: 401 })
  })

  it('rejects an unknown username with the SAME generic error and status', async () => {
    const result = await new AuthService(new FakeUserRepository()).login('NOTAUSER', 'password123')

    expect(result).toEqual({ error: 'invalid username or password', code: 401 })
  })

  it('rejects a missing username or password with a 400', async () => {
    const service = new AuthService(new FakeUserRepository())

    expect(await service.login('', 'password123')).toEqual({
      error: 'username and password are required',
      code: 400,
    })
    expect(await service.login('JSMITH', '')).toEqual({
      error: 'username and password are required',
      code: 400,
    })
  })
})
