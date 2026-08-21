import type { AuthUser } from '../types/auth'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/auth${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.error ?? `Request failed with status ${res.status}`)
  }
  return res.json()
}

export const authApi = {
  login: (username: string, password: string) =>
    request<AuthUser>('/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
}
