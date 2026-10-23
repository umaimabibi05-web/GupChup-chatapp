import { useEffect, useRef, useState } from 'react'
import Avatar from './Avatar.jsx'
import useUsersMap from '../hooks/useUsersMap.js'
import {
  addMembers, deleteGroup, leaveGroup, lookupUser, removeMember, setAdmin, updateGroupInfo,
} from '../lib/chatApi.js'
import { uploadToCloudinary } from '../lib/cloudinary.js'
import { friendlyError } from '../lib/format.js'

const field = 'mt-1 w-full rounded-xl border border-line bg-bg px-4 py-2.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30'

export default function GroupInfoModal({ chat, me, onClose }) {
  const users = useUsersMap(chat.members)
  const isAdmin = chat.admins?.includes(me.uid)
  const [name, setName] = useState(chat.name)
  const [desc, setDesc] = useState(chat.description || '')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [q, setQ] = useState('')
  const [found, setFound] = useState(null)
  const [findErr, setFindErr] = useState('')
  const photo = useRef(null)

  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])

  const run = async (fn) => {
    setBusy(true); setMsg('')
    try { await fn() } catch (e) { setMsg(friendlyError(e)) }
    setBusy(false)
  }

  const save = (e) => {
    e.preventDefault()
    const n = name.trim()
    if (!n) return setMsg('Group name is required.')
    run(async () => {
      const patch = {}
      if (n !== chat.name) patch.name = n
      if (desc.trim() !== (chat.description || '')) patch.description = desc.trim().slice(0, 200)
      if (Object.keys(patch).length) await updateGroupInfo(chat.id, me.uid, me.username, patch)
      setMsg('Saved ✓')
    })
  }

  const onPhoto = (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (!f.type.startsWith('image/') || f.size > 5 * 1024 * 1024) return setMsg('Choose an image under 5 MB.')
    run(async () => {
      const { url } = await uploadToCloudinary(f)
      await updateGroupInfo(chat.id, me.uid, me.username, { photoURL: url })
    })
  }

  const find = async (e) => {
    e.preventDefault()
    setFound(null); setFindErr('')
    if (!q.trim()) return
    try {
      const u = await lookupUser(q)
      if (!u) setFindErr('No user found.')
      else if (chat.members.includes(u.uid)) setFindErr('Already in this group.')
      else setFound(u)
    } catch (err) { setFindErr(err.message === 'INVALID_PHONE' ? 'Invalid phone number.' : friendlyError(err)) }
  }

  const add = () => run(async () => { await addMembers(chat.id, me.uid, me.username, [found]); setFound(null); setQ('') })
  const remove = (u) => window.confirm(`Remove ${u.username} from the group?`) &&
    run(() => removeMember(chat.id, me.uid, me.username, u))
  const toggleAdmin = (u, makeAdmin) => run(() => setAdmin(chat.id, u.uid, makeAdmin))
  const leave = () => window.confirm('Leave this group?') && run(async () => { await leaveGroup(chat, me.uid, me.username); onClose() })
  const destroy = () => window.confirm('Delete this group for everyone? This cannot be undone.') &&
    run(async () => { await deleteGroup(chat.id); onClose() })

  const ordered = [...chat.members].sort((a, b) =>
    Number(chat.admins?.includes(b)) - Number(chat.admins?.includes(a)) ||
    (users[a]?.username || '').localeCompare(users[b]?.username || ''))

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/50 sm:place-items-center" onClick={onClose}>
      <div role="dialog" aria-label="Group info" onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-line bg-surface p-6 shadow-2xl scroll-thin sm:max-w-lg sm:rounded-3xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-extrabold">Group info</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-full border border-line px-3 py-1 text-sm">✕</button>
        </div>

        <div className="flex items-center gap-4">
          <Avatar user={chat} size="h-20 w-20" text="text-3xl" />
          {isAdmin && (
            <>
              <button onClick={() => photo.current?.click()} disabled={busy} className="rounded-xl border border-line px-4 py-2 text-sm font-semibold hover:border-brand">Change photo</button>
              <input ref={photo} type="file" accept="image/*" hidden onChange={onPhoto} />
            </>
          )}
        </div>

        {isAdmin ? (
          <form onSubmit={save} className="mt-4 space-y-3">
            <label className="block text-sm font-semibold">Group name
              <input className={field} value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="block text-sm font-semibold">Description
              <textarea className={`${field} resize-none`} rows={2} maxLength={200} value={desc} onChange={(e) => setDesc(e.target.value)} />
            </label>
            <button disabled={busy} className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-brand-ink disabled:opacity-60">Save changes</button>
          </form>
        ) : (
          <div className="mt-4">
            <p className="text-lg font-bold">{chat.name}</p>
            <p className="text-sm text-muted">{chat.description || 'No description'}</p>
          </div>
        )}
        {msg && <p role="status" className={`mt-3 text-sm ${msg.endsWith('✓') ? 'text-brand' : 'text-red-500'}`}>{msg}</p>}

        {isAdmin && (
          <section className="mt-6 border-t border-line pt-5">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Add member</h3>
            <form onSubmit={find} className="flex gap-2">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Phone number or username" className={`${field} mt-0 flex-1`} />
              <button className="rounded-xl bg-brand px-4 text-sm font-semibold text-brand-ink">Find</button>
            </form>
            {findErr && <p className="mt-2 text-sm text-red-500">{findErr}</p>}
            {found && (
              <div className="mt-3 flex items-center gap-3 rounded-2xl border border-line p-3">
                <Avatar user={found} size="h-10 w-10" />
                <span className="flex-1 truncate font-semibold">{found.username}</span>
                <button onClick={add} disabled={busy} className="rounded-xl bg-brand px-4 py-1.5 text-sm font-semibold text-brand-ink">Add</button>
              </div>
            )}
          </section>
        )}

        <section className="mt-6 border-t border-line pt-5">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted">{chat.members.length} members</h3>
          <ul className="space-y-2">
            {ordered.map((id) => {
              const u = users[id]
              const admin = chat.admins?.includes(id)
              return (
                <li key={id} className="flex items-center gap-3">
                  <Avatar user={u} size="h-10 w-10" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{u?.username || '…'}{id === me.uid && ' (You)'}</p>
                    <p className="truncate text-xs text-muted">{u?.about}</p>
                  </div>
                  {admin && <span className="rounded-full border border-brand px-2 py-0.5 text-xs font-semibold text-brand">Admin</span>}
                  {isAdmin && id !== me.uid && u && (
                    <span className="flex gap-1">
                      <button onClick={() => toggleAdmin(u, !admin)} disabled={busy} className="rounded-lg border border-line px-2 py-1 text-xs hover:border-brand">
                        {admin ? 'Dismiss' : 'Make admin'}
                      </button>
                      <button onClick={() => remove(u)} disabled={busy} className="rounded-lg border border-red-300 px-2 py-1 text-xs text-red-500 hover:bg-red-500/10">Remove</button>
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        </section>

        <section className="mt-6 flex flex-wrap gap-2 border-t border-line pt-5">
          <button onClick={leave} disabled={busy} className="rounded-xl border border-red-400 px-5 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-500/10">Leave group</button>
          {isAdmin && (
            <button onClick={destroy} disabled={busy} className="rounded-xl bg-red-500 px-5 py-2.5 text-sm font-semibold text-white">Delete group</button>
          )}
        </section>
      </div>
    </div>
  )
}
