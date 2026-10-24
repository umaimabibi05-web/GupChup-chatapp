import { useMemo, useState } from 'react'
import Avatar from './Avatar.jsx'
import useUsersMap from '../hooks/useUsersMap.js'
import { createGroup, lookupUser } from '../lib/chatApi.js'
import { uploadToCloudinary } from '../lib/cloudinary.js'
import { friendlyError } from '../lib/format.js'

const field = 'mt-1 w-full rounded-xl border border-line bg-bg px-4 py-2.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30'

export default function NewGroupModal({ me, chats, onClose, onCreated }) {
  const contactIds = useMemo(
    () => chats.filter((c) => c.type !== 'group').map((c) => c.members.find((id) => id !== me.uid)).filter(Boolean),
    [chats, me.uid]
  )
  const contacts = useUsersMap(contactIds)
  const [extra, setExtra] = useState({})
  const [selected, setSelected] = useState({})
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [photo, setPhoto] = useState(null)
  const [preview, setPreview] = useState('')
  const [q, setQ] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const everyone = { ...contacts, ...extra }
  const list = Object.values(everyone).filter(Boolean).sort((a, b) => a.username.localeCompare(b.username))
  const chosen = Object.keys(selected).filter((k) => selected[k])

  const pickPhoto = (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (!f.type.startsWith('image/') || f.size > 5 * 1024 * 1024) return setError('Choose an image under 5 MB.')
    setPhoto(f); setPreview(URL.createObjectURL(f)); setError('')
  }

  const find = async (e) => {
    e.preventDefault()
    setError('')
    if (!q.trim()) return
    try {
      const u = await lookupUser(q)
      if (!u) return setError('No user found with that phone number or username.')
      if (u.uid === me.uid) return setError('You are already in the group.')
      setExtra((x) => ({ ...x, [u.uid]: u }))
      setSelected((s) => ({ ...s, [u.uid]: true }))
      setQ('')
    } catch (err) { setError(err.message === 'INVALID_PHONE' ? 'Invalid phone number.' : friendlyError(err)) }
  }

  const create = async (e) => {
    e.preventDefault()
    const n = name.trim()
    if (!n) return setError('Give your group a name.')
    if (chosen.length === 0) return setError('Select at least one member.')
    setBusy(true); setError('')
    try {
      const photoURL = photo ? (await uploadToCloudinary(photo)).url : ''
      const id = await createGroup({
        me: me.uid, myName: me.username, name: n, description: desc.trim(), photoURL, memberIds: chosen,
      })
      onCreated(id)
    } catch (err) { setError(friendlyError(err)); setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/50 sm:place-items-center" onClick={onClose}>
      <form onSubmit={create} onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full min-w-0 overflow-y-auto rounded-t-3xl border border-line bg-surface p-6 shadow-2xl scroll-thin sm:max-w-lg sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-extrabold">New group</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full border border-line px-3 py-1 text-sm">✕</button>
        </div>

        <div className="flex items-center gap-4">
          <label className="cursor-pointer">
            {preview ? <img src={preview} alt="" className="h-16 w-16 rounded-full object-cover" /> : (
              <span className="grid h-16 w-16 place-items-center rounded-full border-2 border-dashed border-line text-2xl">📷</span>
            )}
            <input type="file" accept="image/*" hidden onChange={pickPhoto} />
          </label>
          <label className="block flex-1 text-sm font-semibold">Group name
            <input className={field} value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="Weekend plan" />
          </label>
        </div>
        <label className="mt-3 block text-sm font-semibold">Description (optional)
          <input className={field} value={desc} maxLength={200} onChange={(e) => setDesc(e.target.value)} />
        </label>

        <h3 className="mb-2 mt-5 text-xs font-bold uppercase tracking-wide text-muted">Add members ({chosen.length} selected)</h3>
        <div className="flex gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find by phone number or username" className={`${field} mt-0 flex-1`}
            onKeyDown={(e) => e.key === 'Enter' && find(e)} />
          <button type="button" onClick={find} className="rounded-xl border border-line px-4 text-sm font-semibold hover:border-brand">Find</button>
        </div>

        <ul className="mt-3 max-h-56 space-y-1 overflow-y-auto scroll-thin">
          {list.length === 0 && <li className="py-3 text-center text-sm text-muted">Your chats will appear here. You can also find people above.</li>}
          {list.map((u) => (
            <li key={u.uid}>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl p-2 hover:bg-bg">
                <input type="checkbox" checked={!!selected[u.uid]} onChange={(e) => setSelected({ ...selected, [u.uid]: e.target.checked })}
                  className="h-4 w-4 accent-[rgb(var(--brand))]" />
                <Avatar user={u} size="h-9 w-9" />
                <span className="truncate font-semibold">{u.username}</span>
              </label>
            </li>
          ))}
        </ul>

        {error && <p role="alert" className="mt-3 text-sm text-red-500">{error}</p>}
        <button disabled={busy} className="mt-5 w-full rounded-xl bg-brand py-3 font-semibold text-brand-ink disabled:opacity-60">
          {busy ? 'Creating…' : 'Create group'}
        </button>
      </form>
    </div>
  )
}
