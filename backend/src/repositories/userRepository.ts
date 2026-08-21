import { getPool } from '@trade-blotter/database'
import type { UserCredentials, UserRow } from '../models/user.js'

function mapRow(row: UserRow): UserCredentials {
  return { username: row.username, passwordHash: row.password_hash }
}

export interface IUserRepository {
  getByUsername(username: string): Promise<UserCredentials | undefined>
}

// Repository for the `users` table — the only place in the backend that talks SQL for auth.
// Read-only: no create/update, since login is the only feature (no signup flow).
export class UserRepository implements IUserRepository {
  async getByUsername(username: string): Promise<UserCredentials | undefined> {
    const [rows] = await getPool().query<UserRow[]>(
      'SELECT username, password_hash FROM users WHERE username = ?',
      [username],
    )
    return rows[0] ? mapRow(rows[0]) : undefined
  }
}
