import type { RowDataPacket } from '@trade-blotter/database'

// Raw shape of a row from the `users` table, before UserRepository.mapRow converts it — mirrors
// Trade/TradeRow in models/trade.ts.
export interface UserRow extends RowDataPacket {
  username: string
  password_hash: string
}

// Domain shape of a user's stored credentials. Internal to the repository/service layer only —
// AuthService consumes passwordHash to call verifyPassword, then returns just `{ username }` to
// the controller. No broader "User" type exists because nothing else about a user is ever read
// or exposed.
export interface UserCredentials {
  username: string
  passwordHash: string
}
