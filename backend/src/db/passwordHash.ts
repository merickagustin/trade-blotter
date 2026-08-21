import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 10

// bcryptjs (pure JS, no native compilation — avoids the node-gyp/prebuilt-binary risk that
// would complicate this project's cross-platform Docker builds) embeds the salt in the hash
// itself, so a single stored hash is enough to both create and verify — no separate salt
// column needed. Used by seeding (hashPassword) and login (verifyPassword).
export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, SALT_ROUNDS)
}

// bcrypt.compareSync is timing-safe internally — no manual constant-time comparison needed.
export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash)
}
