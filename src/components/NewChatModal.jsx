import { useState } from 'react'
import Avatar from './Avatar.jsx'
import { findUserByPhone, findUserByUsername } from '../lib/chatApi.js'
import { normalizePhone } from '../lib/phone.js'
import { friendlyError } from '../lib/format.js'

export default function NewChatModal({ me, onClose, onStart }) {
  const [q, setQ] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const search = async (e) => {
    e.preventDefault()
    setError(''); setResult(null)
    const raw = q.trim()
    if (!raw) return
    const byName = /[a-zA-Z_]/.test(raw)
    const phone = byName ? null : normalizePhone(raw)
    if (!byName && !phone) return setError('That does not look like a valid phone number.')
    setBusy(true)
    try {
      const u = byName ? await findUserByUsername(raw) : await findUserByPhone(phone)
      if (!u) setError('No user found. They need to sign up on Gup Chup first.')
      else if (u.uid === me) setError('That is your own account.')
      else setResult(u)
    } catch (err) { setError(friendlyError(err)) }
    setBusy(false)
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/50 sm:place-items-center" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full min-w-0 rounded-t-3xl border border-line bg-surface p-6 shadow-2xl sm:max-w-md sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-extrabold">New chat</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-full border border-line px-3 py-1 text-sm">✕</button>
        </div>
        <form onSubmit={search} className="flex gap-2">
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Phone number or username"
            className="min-w-0 flex-1 rounded-xl border border-line bg-bg px-4 py-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30" />
          <button disabled={busy} className="rounded-xl bg-brand px-4 font-semibold text-brand-ink disabled:opacity-60">{busy ? '…' : 'Find'}</button>
        </form>
        <p className="mt-2 text-xs text-muted">Tip: use the international format, like +923001234567.</p>

        {error && <p role="alert" className="mt-4 text-sm text-red-500">{error}</p>}
        {result && (
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-line p-3">
            <Avatar user={result} size="h-12 w-12" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{result.username}</p>
              <p className="truncate text-xs text-muted">{result.about}</p>
            </div>
            <button onClick={() => onStart(result.uid)} className="shrink-0 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-brand-ink">Chat</button>
          </div>
        )}
      </div>
    </div>
  )
}
