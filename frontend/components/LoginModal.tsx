import { useState } from 'react'
import type { FormEvent } from 'react'
import type { LoginModalProps } from '../types/auth'

function LoginModal({ onLogin }: LoginModalProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await onLogin(username, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>Log In</h2>
        <form onSubmit={handleSubmit}>
          <label>
            Username
            <input required autoFocus value={username} onChange={(e) => setUsername(e.target.value)} />
          </label>
          <label>
            Password
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          {error && <p className="form-error">{error}</p>}

          <div className="modal-actions">
            <button type="submit" disabled={submitting}>
              {submitting ? 'Logging in…' : 'Log In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default LoginModal
