import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight">
      <span className="grid h-10 w-10 place-items-center rounded-xl border-2 border-ink bg-accent text-lg text-white shadow-[2px_2px_0_rgb(var(--ink))]">G</span>
      Gup Chup
    </Link>
  )
}

export default function Navbar() {
  const { user } = useAuth()
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
      <Logo />
      <nav className="flex items-center gap-2 sm:gap-4">
        <a href="/#features" className="hidden text-sm font-semibold hover:underline sm:block">Features</a>
        <a href="/#how" className="hidden text-sm font-semibold hover:underline sm:block">How it works</a>
        {user ? (
          <Link to="/chat" className="btn-print bg-brand !px-5 !py-2 text-sm text-brand-ink">Open chat</Link>
        ) : (
          <>
            <Link to="/login" className="btn-print bg-surface !px-5 !py-2 text-sm">Log in</Link>
            <Link to="/signup" className="btn-print hidden bg-brand !px-5 !py-2 text-sm text-brand-ink sm:inline-flex">Sign up</Link>
          </>
        )}
      </nav>
    </header>
  )
}
