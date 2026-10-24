import { useEffect, useRef, useState } from 'react'
import Avatar from './Avatar.jsx'
import useUsersMap from '../hooks/useUsersMap.js'
import { unblockUser } from '../lib/chatApi.js'
import { THEMES, useTheme } from '../context/ThemeContext.jsx'
import { USERNAME_RE, changePassword, changeUsername, logOut, saveProfile, uploadAvatar } from '../lib/accountApi.js'
import { friendlyError } from '../lib/format.js'

const field = 'mt-1 w-full rounded-xl border border-line bg-bg px-4 py-2.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30'

function Toggle({ checked, onChange, label, hint }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-xl px-1 py-2 text-left">
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-brand' : 'bg-line'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </span>
    </button>
  )
}

function Section({ title, children }) {
  return (
    <section className="border-t border-line py-5 first:border-t-0 first:pt-0">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted">{title}</h3>
      {children}
    </section>
  )
}

export default function SettingsModal({ me, blocked, onClose }) {
  const blockedUsers = useUsersMap([...blocked.keys()])
  const { theme, setTheme } = useTheme()
  const [username, setUsername] = useState(me.username)
  const [about, setAbout] = useState(me.about || '')
  const [msg, setMsg] = useState({ type: '', text: '' })
  const [busy, setBusy] = useState(false)
  const [pw, setPw] = useState({ current: '', next: '' })
  const [pwMsg, setPwMsg] = useState({ type: '', text: '' })
  const photo = useRef(null)

  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])

  const saveInfo = async (e) => {
    e.preventDefault()
    if (!USERNAME_RE.test(username)) return setMsg({ type: 'err', text: 'Username: 3-20 letters, numbers or underscores.' })
    setBusy(true)
    try {
      if (username !== me.username) await changeUsername(me.uid, me.username, username)
      await saveProfile(me.uid, { about: about.trim().slice(0, 80) })
      setMsg({ type: 'ok', text: 'Profile saved ✓' })
    } catch (err) { setMsg({ type: 'err', text: friendlyError(err) }) }
    setBusy(false)
  }

  const onPhoto = async (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (!f.type.startsWith('image/') || f.size > 5 * 1024 * 1024) return setMsg({ type: 'err', text: 'Choose an image under 5 MB.' })
    setBusy(true)
    try { await saveProfile(me.uid, { photoURL: await uploadAvatar(f) }); setMsg({ type: 'ok', text: 'Photo updated ✓' }) }
    catch (err) { setMsg({ type: 'err', text: friendlyError(err) }) }
    setBusy(false)
  }

  const toggle = async (key, value) => {
    if (key === 'notifications' && value && 'Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission()
    }
    saveProfile(me.uid, { [key]: value })
  }

  const savePw = async (e) => {
    e.preventDefault()
    if (pw.next.length < 6) return setPwMsg({ type: 'err', text: 'New password must be at least 6 characters.' })
    try { await changePassword(pw.current, pw.next); setPw({ current: '', next: '' }); setPwMsg({ type: 'ok', text: 'Password changed ✓' }) }
    catch (err) { setPwMsg({ type: 'err', text: friendlyError(err) }) }
  }

  const note = (m) => m.text && <p role="status" className={`text-sm ${m.type === 'err' ? 'text-red-500' : 'text-brand'}`}>{m.text}</p>

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/50 sm:place-items-center" onClick={onClose}>
      <div role="dialog" aria-label="Settings" onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full min-w-0 overflow-y-auto rounded-t-3xl border border-line bg-surface p-6 shadow-2xl scroll-thin sm:max-w-lg sm:rounded-3xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-extrabold">Settings</h2>
          <button onClick={onClose} aria-label="Close settings" className="rounded-full border border-line px-3 py-1 text-sm">✕</button>
        </div>

        <Section title="Edit profile">
          <div className="mb-4 flex items-center gap-4">
            <Avatar user={me} size="h-20 w-20" text="text-3xl" />
            <div>
              <button onClick={() => photo.current?.click()} disabled={busy} className="rounded-xl border border-line px-4 py-2 text-sm font-semibold hover:border-brand">Change photo</button>
              <input ref={photo} type="file" accept="image/*" hidden onChange={onPhoto} />
              <p className="mt-1 text-xs text-muted">Phone: {me.phone}</p>
            </div>
          </div>
          <form onSubmit={saveInfo} className="space-y-3">
            <label className="block text-sm font-semibold">Username
              <input className={field} value={username} maxLength={20} onChange={(e) => setUsername(e.target.value)} />
            </label>
            <label className="block text-sm font-semibold">About
              <textarea className={`${field} resize-none`} rows={2} maxLength={80} value={about} onChange={(e) => setAbout(e.target.value)} />
            </label>
            {note(msg)}
            <button disabled={busy} className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-brand-ink disabled:opacity-60">{busy ? 'Saving…' : 'Save changes'}</button>
          </form>
        </Section>

        <Section title="Privacy">
          <Toggle checked={me.readReceipts !== false} onChange={(v) => toggle('readReceipts', v)}
            label="Read receipts" hint="If off, others will not see blue ticks when you read their messages." />
        </Section>

        <Section title="Notifications">
          <Toggle checked={me.notifications !== false} onChange={(v) => toggle('notifications', v)}
            label="Message notifications" hint="Show an alert for new messages when you are away from the chat." />
          <Toggle checked={me.sound !== false} onChange={(v) => toggle('sound', v)} label="Notification sound" />
        </Section>

        <Section title="Appearance">
          <div className="flex flex-wrap gap-2">
            {THEMES.map((t) => (
              <button key={t.id} onClick={() => setTheme(t.id)}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${theme === t.id ? 'border-brand font-bold' : 'border-line'}`}>
                <span className="h-3.5 w-3.5 rounded-full" style={{ background: t.color }} />{t.label}
              </button>
            ))}
          </div>
        </Section>

        <Section title="Blocked contacts">
          {blocked.size === 0 ? (
            <p className="text-sm text-muted">You have not blocked anyone.</p>
          ) : (
            <ul className="space-y-2">
              {[...blocked.keys()].map((id) => (
                <li key={id} className="flex items-center gap-3">
                  <Avatar user={blockedUsers[id]} size="h-9 w-9" />
                  <span className="flex-1 truncate font-semibold">{blockedUsers[id]?.username || '…'}</span>
                  <button onClick={() => unblockUser(me.uid, id)} className="rounded-lg border border-line px-3 py-1 text-sm hover:border-brand">Unblock</button>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Change password">
          <form onSubmit={savePw} className="space-y-3">
            <input type="password" placeholder="Current password" className={field} value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} autoComplete="current-password" />
            <input type="password" placeholder="New password" className={field} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} autoComplete="new-password" />
            {note(pwMsg)}
            <button className="rounded-xl border border-line px-5 py-2.5 text-sm font-semibold hover:border-brand">Update password</button>
          </form>
        </Section>

        <Section title="Account">
          <button onClick={() => logOut(me.uid)} className="rounded-xl border border-red-400 px-5 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-500/10">Log out</button>
        </Section>
      </div>
    </div>
  )
}
