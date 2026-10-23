import { useState } from 'react'
import { Link } from 'react-router-dom'
import AuthShell from '../components/AuthShell.jsx'
import { logIn, resetPassword } from '../lib/accountApi.js'
import { friendlyError } from '../lib/format.js'

const input = 'mt-1 w-full rounded-xl border-2 border-line bg-bg px-4 py-3 outline-none focus:border-brand'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setError(''); setInfo('')
    try { await logIn(email.trim(), password) }
    catch (err) { setError(friendlyError(err)); setBusy(false) }
  }

  const forgot = async () => {
    if (!email.trim()) return setError('Enter your email above first.')
    try { await resetPassword(email.trim()); setError(''); setInfo('Password reset email sent. Check your inbox.') }
    catch (err) { setError(friendlyError(err)) }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Log in to continue chatting.">
      <form onSubmit={submit}>
        <label className="mt-5 block text-sm font-bold">Email
          <input type="email" className={input} value={email} onChange={(e) => { setEmail(e.target.value); setError('') }} autoComplete="email" />
        </label>
        <label className="mt-4 block text-sm font-bold">Password
          <input type="password" className={input} value={password} onChange={(e) => { setPassword(e.target.value); setError('') }} autoComplete="current-password" />
        </label>
        <button type="button" onClick={forgot} className="mt-2 text-sm font-bold text-brand underline">Forgot password?</button>

        {error && <p role="alert" className="mt-4 text-sm font-semibold text-red-600">{error}</p>}
        {info && <p className="mt-4 text-sm font-semibold text-brand">{info}</p>}
        <button disabled={busy} className="btn-print mt-6 w-full bg-brand text-brand-ink disabled:opacity-60">
          {busy ? 'Logging in…' : 'Log in'}
        </button>
        <p className="mt-4 text-center text-sm text-muted">
          New here? <Link to="/signup" className="font-bold text-brand underline">Create an account</Link>
        </p>
      </form>
    </AuthShell>
  )
}
