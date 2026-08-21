import { useState } from 'react'
import type { FormEvent } from 'react'
import type { NewTrade, Trade } from '../types/trade'

interface TradeFormModalProps {
  mode: 'create' | 'amend'
  initialTrade?: Trade | null
  onClose: () => void
  onSubmit: (data: NewTrade) => Promise<void>
}

const emptyForm: NewTrade = {
  symbol: '',
  quantity: 0,
  price: 0,
  side: 'BUY',
  trader: '',
  tradeDate: new Date().toISOString().slice(0, 10),
}

function TradeFormModal({ mode, initialTrade, onClose, onSubmit }: TradeFormModalProps) {
  const [form, setForm] = useState<NewTrade>(
    initialTrade
      ? {
          symbol: initialTrade.symbol,
          quantity: initialTrade.quantity,
          price: initialTrade.price,
          side: initialTrade.side,
          trader: initialTrade.trader,
          tradeDate: initialTrade.tradeDate,
        }
      : emptyForm,
  )
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await onSubmit(form)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <h2>{mode === 'create' ? 'Create Trade' : 'Amend Trade'}</h2>
        <form onSubmit={handleSubmit}>
          <label>
            Symbol
            <input
              required
              value={form.symbol}
              onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })}
            />
          </label>
          <label>
            Side
            <select
              value={form.side}
              onChange={(e) => setForm({ ...form, side: e.target.value as NewTrade['side'] })}
            >
              <option value="BUY">BUY</option>
              <option value="SELL">SELL</option>
            </select>
          </label>
          <label>
            Quantity
            <input
              required
              type="number"
              min="1"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
            />
          </label>
          <label>
            Price
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
            />
          </label>
          <label>
            Trader
            <input
              required
              value={form.trader}
              onChange={(e) => setForm({ ...form, trader: e.target.value })}
            />
          </label>
          <label>
            Trade Date
            <input
              required
              type="date"
              value={form.tradeDate.slice(0, 10)}
              onChange={(e) => setForm({ ...form, tradeDate: e.target.value })}
            />
          </label>

          {error && <p className="form-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default TradeFormModal
