import { Link } from 'react-router-dom'
import { Logo } from './Navbar.jsx'

const points = [
  ['📱', 'Find friends by phone number'],
  ['👥', 'Groups, voice notes and calls'],
  ['🔍', 'Search any message in a chat'],
]

export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className="public-ui min-h-full">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Logo />
        <Link to="/" className="text-sm font-semibold hover:underline">← Back to home</Link>
      </header>

      <main className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-14 pt-4 md:grid-cols-2">
        <section className="hidden md:block">
          <h2 className="font-display text-5xl font-extrabold leading-[1.1]">
            Your people,<br />one tap away.
          </h2>
          <ul className="mt-8 space-y-4">
            {points.map(([icon, text]) => (
              <li key={text} className="flex items-center gap-4 text-lg font-semibold">
                <span className="grid h-12 w-12 place-items-center rounded-2xl border-2 border-ink bg-surface text-2xl shadow-[3px_3px_0_rgb(var(--ink))]">{icon}</span>
                {text}
              </li>
            ))}
          </ul>
        </section>

        <div className="print-card p-6 sm:p-8">
          <h1 className="font-display text-3xl font-extrabold">{title}</h1>
          <p className="mt-1 text-sm text-muted">{subtitle}</p>
          {children}
        </div>
      </main>
    </div>
  )
}
