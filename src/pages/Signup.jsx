import { useState } from 'react'
import { Link } from 'react-router-dom'
import AuthShell from '../components/AuthShell.jsx'
import { USERNAME_RE, signUp } from '../lib/accountApi.js'
import { normalizePhone } from '../lib/phone.js'
import { friendlyError } from '../lib/format.js'

const input = 'mt-1 w-full rounded-xl border-2 border-line bg-bg px-4 py-3 outline-none focus:border-brand'

export default function Signup() {
  const [f, setF] = useState({ username: '', email: '', phone: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setError('') }

  const submit = async (e) => {
    e.preventDefault()
    const phone = normalizePhone(f.phone)
    if (!USERNAME_RE.test(f.username)) return setError('Username: 3-20 characters, letters, numbers and underscores only.')
    if (!phone) return setError('Enter a valid phone number, e.g. +923001234567 or 03001234567.')
    if (f.password.length < 6) return setError('Password must be at least 6 characters.')
    if (f.password !== f.confirm) return setError('Passwords do not match.')
    setBusy(true)
    try {
      await signUp({ username: f.username, email: f.email.trim(), password: f.password, phone })
    } catch (err) {
      setError(friendlyError(err))
      setBusy(false)
    }
  }

  return (
    <AuthShell title="Create your account" subtitle="Friends will find you by your phone number.">
      <form onSubmit={submit}>
        <label className="mt-5 block text-sm font-bold">Username
          <input className={input} value={f.username} onChange={set('username')} maxLength={20} placeholder="ali_khan" autoComplete="username" />
        </label>
        <label className="mt-4 block text-sm font-bold">Email
          <input type="email" className={input} value={f.email} onChange={set('email')} placeholder="you@example.com" autoComplete="email" />
        </label>
        <label className="mt-4 block text-sm font-bold">Phone number
          <input type="tel" className={input} value={f.phone} onChange={set('phone')} placeholder="+92 300 1234567" autoComplete="tel" />
        </label>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-bold">Password
            <input type="password" className={input} value={f.password} onChange={set('password')} autoComplete="new-password" />
          </label>
          <label className="block text-sm font-bold">Confirm
            <input type="password" className={input} value={f.confirm} onChange={set('confirm')} autoComplete="new-password" />
          </label>
        </div>

        {error && <p role="alert" className="mt-4 text-sm font-semibold text-red-600">{error}</p>}
        <button disabled={busy} className="btn-print mt-6 w-full bg-brand text-brand-ink disabled:opacity-60">
          {busy ? 'Creating account…' : 'Sign up'}
        </button>
        <p className="mt-4 text-center text-sm text-muted">
          Already have an account? <Link to="/login" className="font-bold text-brand underline">Log in</Link>
        </p>
      </form>
    </AuthShell>
  )
}
