import { useMemo, useState } from 'react'
import Avatar from './Avatar.jsx'
import useUserDoc, { isOnline } from '../hooks/useUserDoc.js'
import useUsersMap from '../hooks/useUsersMap.js'
import useTick from '../hooks/useTick.js'
import { typingUids } from '../lib/chatApi.js'
import { fmtTime, ms } from '../lib/format.js'

const NONE = []

function ChatItem({ chat, me, blocked, active, search, onClick }) {
  const isGroup = chat.type === 'group'
  const last = chat.lastMessage
  const otherId = isGroup ? null : chat.members.find((id) => id !== me.uid)
  const other = useUserDoc(otherId)
  const sender = useUserDoc(isGroup && last && last.type !== 'system' && last.senderId !== me.uid ? last.senderId : null)

  const typers = typingUids(chat, me.uid, blocked)
  useTick(typers.length > 0)
  const typerUsers = useUsersMap(isGroup ? typers : NONE)

  const title = isGroup ? chat.name : other?.username
  if (!title) return null
  const s = search.toLowerCase()
  if (s && !title.toLowerCase().includes(s) && !(last?.text || '').toLowerCase().includes(s)) return null

  const isBlocked = !isGroup && blocked.has(otherId)
  const cleared = ms(chat.clearedAt?.[me.uid]) ?? 0
  const hasMessages = last && (ms(chat.updatedAt) ?? Infinity) > cleared
  const unread = isBlocked ? 0 : chat.unread?.[me.uid] || 0
  const prefix = !hasMessages || last.type === 'system' ? '' : last.senderId === me.uid ? 'You: ' : isGroup && sender ? `${sender.username}: ` : ''

  let preview
  let typing = false
  if (isBlocked) preview = '🚫 Blocked'
  else if (typers.length) {
    typing = true
    preview = isGroup ? `${typers.map((id) => typerUsers[id]?.username || 'Someone').join(', ')} typing…` : 'typing…'
  } else preview = hasMessages ? `${prefix}${last.text}` : isGroup ? 'New group' : 'Say hello 👋'

  return (
    <li>
      <button onClick={onClick} className={`flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-bg ${active ? 'bg-bg' : ''}`}>
        <span className="relative">
          <Avatar user={isGroup ? chat : other} size="h-12 w-12" />
          {!isGroup && !isBlocked && isOnline(other) && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-surface bg-green-500" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className="truncate font-bold">{isGroup && '👥 '}{title}</span>
            {hasMessages && !isBlocked && <span className="shrink-0 text-xs text-muted">{fmtTime(chat.updatedAt)}</span>}
          </span>
          <span className="flex items-center justify-between gap-2">
            <span className={`truncate text-sm ${typing ? 'font-semibold text-brand' : 'text-muted'}`}>{preview}</span>
            {unread > 0 && (
              <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-brand px-1.5 text-xs font-bold text-brand-ink">{unread}</span>
            )}
          </span>
        </span>
      </button>
    </li>
  )
}

export default function ChatList({ chats, ready, me, blocked, activeId, onSelect, onNew, onNewGroup, onSettings }) {
  const [search, setSearch] = useState('')
  const sorted = useMemo(
    () => [...chats].sort((a, b) => (ms(b.updatedAt) ?? Date.now()) - (ms(a.updatedAt) ?? Date.now())),
    [chats]
  )
  return (
    <>
      <div className="flex items-center gap-2 border-b border-line p-4">
        <button onClick={onSettings} aria-label="Profile and settings"><Avatar user={me} size="h-10 w-10" /></button>
        <h1 className="flex-1 text-xl font-extrabold">Gup Chup</h1>
        <button onClick={onNewGroup} aria-label="New group" title="New group" className="grid h-10 w-10 place-items-center rounded-full border border-line text-lg hover:border-brand">👥</button>
        <button onClick={onNew} aria-label="New chat" title="New chat" className="grid h-10 w-10 place-items-center rounded-full bg-brand text-xl text-brand-ink">＋</button>
        <button onClick={onSettings} aria-label="Settings" title="Settings" className="grid h-10 w-10 place-items-center rounded-full border border-line text-lg hover:border-brand">⚙</button>
      </div>
      <div className="p-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search chats"
          className="w-full rounded-full border border-line bg-bg px-4 py-2 text-sm outline-none focus:border-brand" />
      </div>
      <ul className="flex-1 overflow-y-auto px-2 pb-2 scroll-thin">
        {sorted.map((c) => (
          <ChatItem key={c.id} chat={c} me={me} blocked={blocked} active={c.id === activeId} search={search} onClick={() => onSelect(c.id)} />
        ))}
        {ready && chats.length === 0 && (
          <li className="px-4 py-10 text-center text-sm text-muted">
            No chats yet. Tap ＋ to find a friend by phone number, or 👥 to create a group.
          </li>
        )}
      </ul>
    </>
  )
}
