import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import { useAuth } from '../context/AuthContext.jsx'

const features = [
  ['📱', 'Phone-number friends', 'Sign up with your number and friends find you by it. No contact upload needed.'],
  ['👥', 'Groups', 'Create groups, add or remove members, make admins and manage everything in one place.'],
  ['🎤', 'Voice messages', 'Hold a thought? Record it. Send voice notes in one tap.'],
  ['📎', 'Photos, videos, files', 'Share media and documents, react with emojis, reply, edit or delete.'],
  ['📞', 'Voice calls', 'Call a friend right from the chat. Works in your browser.'],
  ['🔍', 'Message search', 'Search inside a chat and jump straight to the message you need.'],
]

const steps = ['Create your account', 'Add a friend or make a group', 'Chat, share and call']

function Phone() {
  return (
    <div className="relative mx-auto w-full max-w-sm">
      <span className="sticker -left-2 top-6 -rotate-6 bg-accent text-white">📞 Calls</span>
      <span className="sticker -right-2 top-24 rotate-6">🎤 Voice notes</span>
      <span className="sticker -left-4 bottom-20 rotate-3">👥 Groups</span>

      <div className="print-card rotate-2 p-4">
        <div className="mb-3 flex items-center gap-3 border-b-2 border-dashed border-line pb-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-accent font-bold text-white">W</span>
          <div className="flex-1">
            <p className="font-bold leading-tight">Weekend Plan 🏖</p>
            <p className="text-xs text-muted">Ayesha, Bilal, Sara, You</p>
          </div>
          <span>🔍</span>
        </div>

        <div className="space-y-3 text-sm">
          <div>
            <p className="mb-0.5 text-xs font-bold text-brand">Ayesha</p>
            <span className="inline-block rounded-2xl rounded-bl-sm border border-line bg-bg px-3 py-2">Beach on Saturday?</span>
          </div>
          <div className="flex justify-end">
            <span className="rounded-2xl rounded-br-sm bg-mine px-3 py-2 text-mine-ink">Yes! 8 am sharp 🚗</span>
          </div>
          <div>
            <p className="mb-0.5 text-xs font-bold text-brand">Bilal</p>
            <span className="inline-flex items-center gap-2 rounded-2xl rounded-bl-sm border border-line bg-bg px-3 py-2">
              🎤 <span className="h-1.5 w-24 rounded-full bg-line"><span className="block h-full w-1/3 rounded-full bg-brand" /></span> 0:12
            </span>
            <span className="ml-1 rounded-full border border-line bg-surface px-1.5 text-xs">👍 2</span>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <div className="flex-1 rounded-full border-2 border-line px-4 py-2 text-sm text-muted">Type a message</div>
          <div className="grid h-9 w-9 place-items-center rounded-full bg-brand text-brand-ink">🎤</div>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const { user } = useAuth()
  const cta = user ? '/chat' : '/signup'

  return (
    <div className="public-ui min-h-full">
      <Navbar />

      <section className="mx-auto grid max-w-6xl items-center gap-14 px-4 py-12 md:grid-cols-2 md:py-20">
        <div>
          <span className="inline-block rounded-full border-2 border-ink bg-surface px-4 py-1 text-sm font-bold shadow-[2px_2px_0_rgb(var(--ink))]">
            Chat · Call · Share
          </span>
          <h1 className="mt-5 font-display text-5xl font-extrabold leading-[1.05] sm:text-6xl lg:text-7xl">
            Say it all on <span className="text-accent">Gup Chup</span>.
          </h1>
          <p className="mt-5 max-w-md text-lg text-muted">
            Real-time chat with friends and groups, voice notes, photos, files and calls, all tied to your phone number.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link to={cta} className="btn-print bg-brand text-brand-ink">{user ? 'Back to chat' : 'Get started free'}</Link>
            <a href="#features" className="btn-print bg-surface">See features</a>
          </div>
          <p className="mt-5 text-sm font-semibold text-muted">Free · Works on phone, tablet and laptop</p>
        </div>
        <Phone />
      </section>

      <section id="features" className="border-y-2 border-ink bg-surface/90">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="font-display text-4xl font-extrabold">Everything you expect, nothing you do not.</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(([icon, title, text]) => (
              <article key={title} className="print-card bg-bg p-6">
                <span className="text-3xl">{icon}</span>
                <h3 className="mt-3 text-lg font-extrabold">{title}</h3>
                <p className="mt-1 text-sm text-muted">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-display text-4xl font-extrabold">How it works</h2>
        <ol className="mt-8 grid gap-5 md:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s} className="print-card flex items-center gap-4 p-5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-ink bg-accent font-extrabold text-white">{i + 1}</span>
              <span className="font-bold">{s}</span>
            </li>
          ))}
        </ol>

        <div className="print-card mt-14 bg-brand p-8 text-center text-brand-ink sm:p-12">
          <h2 className="font-display text-3xl font-extrabold sm:text-4xl">Ready to start talking?</h2>
          <Link to={cta} className="btn-print mt-6 bg-surface text-ink">{user ? 'Open chat' : 'Create your account'}</Link>
        </div>
      </section>

      <footer className="border-t-2 border-ink bg-surface/90 py-6 text-center text-sm font-semibold">
        &copy; {new Date().getFullYear()} Gup Chup
      </footer>
    </div>
  )
}
