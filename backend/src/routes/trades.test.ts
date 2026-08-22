import { describe, expect, it } from 'vitest'
import { validateNewTrade } from './trades.js'

const validTrade = {
  symbol: 'AAPL',
  side: 'BUY' as const,
  quantity: 100,
  price: 150.5,
  trader: 'JSMITH',
  book: 'EQUITIES_US',
  counterparty: 'Goldman Sachs',
  tradeTimestamp: '2026-08-18T09:15:23Z',
}

describe('validateNewTrade', () => {
  it('accepts a fully valid trade', () => {
    expect(validateNewTrade(validTrade)).toBeNull()
  })

  it('rejects a missing symbol', () => {
    expect(validateNewTrade({ ...validTrade, symbol: '' })).toBe('symbol is required')
  })

  it('rejects a side that is not BUY or SELL', () => {
    // @ts-expect-error deliberately invalid input
    expect(validateNewTrade({ ...validTrade, side: 'HOLD' })).toBe('side must be BUY or SELL')
  })

  it('rejects a non-positive quantity', () => {
    expect(validateNewTrade({ ...validTrade, quantity: 0 })).toBe('quantity must be a positive number')
    expect(validateNewTrade({ ...validTrade, quantity: -5 })).toBe('quantity must be a positive number')
  })

  it('rejects a non-positive price', () => {
    expect(validateNewTrade({ ...validTrade, price: 0 })).toBe('price must be a positive number')
  })

  it('rejects a missing trader, book, or counterparty', () => {
    expect(validateNewTrade({ ...validTrade, trader: '' })).toBe('trader is required')
    expect(validateNewTrade({ ...validTrade, book: '' })).toBe('book is required')
    expect(validateNewTrade({ ...validTrade, counterparty: '' })).toBe('counterparty is required')
  })

  it('rejects a missing tradeTimestamp', () => {
    expect(validateNewTrade({ ...validTrade, tradeTimestamp: '' })).toBe('tradeTimestamp is required')
  })
})
