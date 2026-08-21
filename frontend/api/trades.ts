import type { NewTrade, Trade } from '../types/trade'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/trades${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.error ?? `Request failed with status ${res.status}`)
  }
  return res.json()
}

export const tradesApi = {
  list: () => request<Trade[]>(''),

  create: (input: NewTrade) =>
    request<Trade>('', { method: 'POST', body: JSON.stringify(input) }),

  amend: (id: string, patch: Partial<NewTrade>) =>
    request<Trade>(`/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),

  cancel: (id: string) => request<Trade>(`/${id}/cancel`, { method: 'POST' }),
}
