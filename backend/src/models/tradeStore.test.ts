import { describe, expect, it } from 'vitest'
import { toIsoTimestamp, toMysqlDatetime } from './tradeStore.js'

describe('toMysqlDatetime', () => {
  it('converts an ISO timestamp to MySQL DATETIME format', () => {
    expect(toMysqlDatetime('2026-08-18T09:15:23Z')).toBe('2026-08-18 09:15:23')
  })
})

describe('toIsoTimestamp', () => {
  it('converts a MySQL DATETIME string back to ISO 8601', () => {
    expect(toIsoTimestamp('2026-08-18 09:15:23')).toBe('2026-08-18T09:15:23Z')
  })
})

describe('round trip', () => {
  it('recovers the original ISO timestamp after converting both ways', () => {
    const original = '2026-08-18T09:15:23Z'
    expect(toIsoTimestamp(toMysqlDatetime(original))).toBe(original)
  })
})
