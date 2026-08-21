import { useEffect, useState } from 'react'
import { tradesApi } from './api/trades'
import TradeBlotter from './components/TradeBlotter'
import TradeFormModal from './components/TradeFormModal'
import type { NewTrade, Trade } from './types/trade'
import './App.css'

type ModalState = { mode: 'create' } | { mode: 'amend'; trade: Trade } | null

function App() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalState>(null)

  useEffect(() => {
    tradesApi
      .list()
      .then(setTrades)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load trades'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const socket = new WebSocket(`${protocol}//${window.location.host}/ws`)

    socket.onmessage = (event) => {
      const { trade } = JSON.parse(event.data) as { type: string; trade: Trade }
      setTrades((prev) =>
        prev.some((t) => t.tradeId === trade.tradeId)
          ? prev.map((t) => (t.tradeId === trade.tradeId ? trade : t))
          : [...prev, trade],
      )
    }

    return () => socket.close()
  }, [])

  async function handleCreate(data: NewTrade) {
    await tradesApi.create(data)
    setModal(null)
  }

  async function handleAmend(tradeId: string, data: NewTrade) {
    await tradesApi.amend(tradeId, data)
    setModal(null)
  }

  async function handleCancel(trade: Trade) {
    if (!confirm(`Cancel trade ${trade.symbol} (${trade.tradeId})?`)) return
    try {
      await tradesApi.cancel(trade.tradeId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel trade')
    }
  }

  return (
    <section id="dashboard">
      {error && <p className="banner-error">{error}</p>}

      {loading ? (
        <p>Loading trades…</p>
      ) : (
        <TradeBlotter
          trades={trades}
          onCreate={() => setModal({ mode: 'create' })}
          onAmend={(trade) => setModal({ mode: 'amend', trade })}
          onCancel={handleCancel}
        />
      )}

      {modal?.mode === 'create' && (
        <TradeFormModal mode="create" onClose={() => setModal(null)} onSubmit={handleCreate} />
      )}
      {modal?.mode === 'amend' && (
        <TradeFormModal
          mode="amend"
          initialTrade={modal.trade}
          onClose={() => setModal(null)}
          onSubmit={(data) => handleAmend(modal.trade.tradeId, data)}
        />
      )}
    </section>
  )
}

export default App
