import { useEffect, useState } from 'react'
import { authApi } from './services/auth'
import { tradesApi } from './services/trades'
import LoginModal from './components/LoginModal'
import PnLView from './components/PnLView'
import PositionSummary from './components/PositionSummary'
import TradeBlotter from './components/TradeBlotter'
import TradeFormModal from './components/TradeFormModal'
import type { AuthUser } from './types/auth'
import type { NewTrade, PositionSummary as PositionSummaryData, SymbolPnl, Trade } from './types/trade'
import './App.css'

type ModalState = { mode: 'create' } | { mode: 'amend'; trade: Trade } | null
type Tab = 'blotter' | 'positions' | 'pnl'

const SESSION_STORAGE_KEY = 'trade-blotter-username'

function App() {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY)
    return stored ? { username: stored } : null
  })
  const [trades, setTrades] = useState<Trade[]>([])
  const [positions, setPositions] = useState<PositionSummaryData[]>([])
  const [pnl, setPnl] = useState<SymbolPnl[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalState>(null)
  const [tab, setTab] = useState<Tab>('blotter')

  function fetchPositions() {
    tradesApi.positions().then(setPositions).catch(() => {
      // Non-critical — leave positions stale rather than surfacing a page-level error over this.
    })
  }

  function fetchPnl() {
    tradesApi.pnl().then(setPnl).catch(() => {
      // Non-critical — leave P&L stale rather than surfacing a page-level error over this.
    })
  }

  // Manual "Refresh" action — re-pulls trades/positions/P&L straight from the API, independent
  // of the WebSocket connection.
  function handleRefresh() {
    tradesApi.list().then(setTrades).catch((err) => setError(err instanceof Error ? err.message : 'Failed to refresh trades'))
    fetchPositions()
    fetchPnl()
  }

  // One-time load of whatever trades already exist, once logged in.
  useEffect(() => {
    if (!user) return
    tradesApi
      .list()
      .then(setTrades)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load trades'))
      .finally(() => setLoading(false))
    fetchPositions()
    fetchPnl()
  }, [user])

  // Live updates: the backend broadcasts every create/amend/cancel to all connected clients
  // (including whichever tab triggered it), so this is the only place `trades` gets mutated
  // after the initial load — handleCreate/handleAmend/handleCancel below intentionally don't
  // touch state themselves, to avoid applying the same change twice. Positions and P&L are
  // computed server-side, so they're refetched (not derived) on every trade event too.
  useEffect(() => {
    if (!user) return
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const socket = new WebSocket(`${protocol}//${window.location.host}/ws`)

    socket.onmessage = (event) => {
      const { trade } = JSON.parse(event.data) as { type: string; trade: Trade }
      setTrades((prev) =>
        prev.some((t) => t.tradeId === trade.tradeId)
          ? prev.map((t) => (t.tradeId === trade.tradeId ? trade : t))
          : [...prev, trade],
      )
      fetchPositions()
      fetchPnl()
    }

    return () => socket.close()
  }, [user])

  // Fire the request and close the modal; the grid updates itself via the WebSocket message.
  async function handleCreate(data: NewTrade) {
    await tradesApi.create(data)
    setModal(null)
  }

  async function handleAmend(tradeId: string, data: NewTrade) {
    await tradesApi.amend(tradeId, data)
    setModal(null)
  }

  // Cancel is a direct row action (no modal), guarded by a confirm dialog since it's irreversible.
  async function handleCancel(trade: Trade) {
    if (!confirm(`Cancel trade ${trade.symbol} (${trade.tradeId})?`)) return
    try {
      await tradesApi.cancel(trade.tradeId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel trade')
    }
  }

  // No try/catch here — a thrown Error propagates up to LoginModal's own try/catch, which is
  // what renders .form-error.
  async function handleLogin(username: string, password: string) {
    const authUser = await authApi.login(username, password)
    sessionStorage.setItem(SESSION_STORAGE_KEY, authUser.username)
    setUser(authUser)
  }

  function handleLogout() {
    sessionStorage.removeItem(SESSION_STORAGE_KEY)
    setUser(null)
    // So logging back in shows "Loading trades…" instead of briefly flashing the previous
    // session's stale trades/positions/pnl before the re-triggered fetch overwrites them.
    setLoading(true)
  }

  if (!user) return <LoginModal onLogin={handleLogin} />

  return (
    <section id="dashboard">
      {error && <p className="banner-error">{error}</p>}

      {loading ? (
        <p>Loading trades…</p>
      ) : (
        <>
          <div className="tabs-row">
            <div className="tabs">
              <button
                type="button"
                className={tab === 'blotter' ? 'active' : undefined}
                onClick={() => setTab('blotter')}
              >
                Trade Blotter
              </button>
              <button
                type="button"
                className={tab === 'positions' ? 'active' : undefined}
                onClick={() => setTab('positions')}
              >
                Position Summary
              </button>
              <button
                type="button"
                className={tab === 'pnl' ? 'active' : undefined}
                onClick={() => setTab('pnl')}
              >
                P&amp;L View
              </button>
            </div>
            <p className="session-bar">
              Logged in as <strong>{user.username}</strong>
              <button type="button" onClick={handleLogout}>
                Log out
              </button>
            </p>
          </div>

          {tab === 'blotter' && (
            <TradeBlotter
              trades={trades}
              onCreate={() => setModal({ mode: 'create' })}
              onAmend={(trade) => setModal({ mode: 'amend', trade })}
              onCancel={handleCancel}
              onRefresh={handleRefresh}
            />
          )}
          {tab === 'positions' && <PositionSummary positions={positions} />}
          {tab === 'pnl' && <PnLView pnl={pnl} />}
        </>
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
