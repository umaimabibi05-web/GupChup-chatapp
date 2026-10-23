import { useEffect, useMemo, useRef, useState } from 'react'
import EmojiPicker from 'emoji-picker-react'
import Avatar from './Avatar.jsx'
import MessageBubble from './MessageBubble.jsx'
import Lightbox from './Lightbox.jsx'
import VoiceRecorder from './VoiceRecorder.jsx'
import GroupInfoModal from './GroupInfoModal.jsx'
import useMessages from '../hooks/useMessages.js'
import useTick from '../hooks/useTick.js'
import useUserDoc, { isOnline } from '../hooks/useUserDoc.js'
import useUsersMap from '../hooks/useUsersMap.js'
import { useTheme } from '../context/ThemeContext.jsx'
import {
  MAX_FILE, blockUser, clearChat, deleteChat, deleteForEveryone, deleteForMe, editMessage, markRead, previewText,
  sendMessage, setTyping, toggleReaction, typingUids, unblockUser, uploadChatFile,
} from '../lib/chatApi.js'
import { dayLabel, fmtSize, friendlyError, fmtTime, kindOf, ms } from '../lib/format.js'

const NONE = []

function Hl({ text, q }) {
  const i = text.toLowerCase().indexOf(q.toLowerCase())
  if (!q || i < 0) return text
  return <>{text.slice(0, i)}<mark className="rounded bg-yellow-300 px-0.5 text-black">{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>
}
const snippet = (t, q) => {
  const i = t.toLowerCase().indexOf(q.toLowerCase())
  const s = Math.max(0, i - 25)
  return (s > 0 ? '…' : '') + t.slice(s, s + 90)
}

export default function ChatWindow({ chat, me, blocked, onBack, onCall }) {
  const isGroup = chat.type === 'group'
  const others = useMemo(() => chat.members.filter((id) => id !== me.uid), [chat.members, me.uid])
  const otherId = isGroup ? null : others[0]
  const other = useUserDoc(otherId)
  const users = useUsersMap(isGroup ? chat.members : NONE)
  const { messages, hasMore, loadMore, loadAll } = useMessages(chat.id)
  const { theme } = useTheme()

  const [text, setText] = useState('')
  const [reply, setReply] = useState(null)
  const [editing, setEditing] = useState(null)
  const [file, setFile] = useState(null)
  const [progress, setProgress] = useState(null)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [recording, setRecording] = useState(false)
  const [viewer, setViewer] = useState(null)
  const [info, setInfo] = useState(false)
  const [error, setError] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [q, setQ] = useState('')
  const [flash, setFlash] = useState(null)
  const bottom = useRef(null)
  const fileInput = useRef(null)
  const area = useRef(null)

  const isBlocked = !isGroup && blocked.has(otherId)
  const blockedAt = isBlocked ? blocked.get(otherId) : 0
  const clearedAt = ms(chat.clearedAt?.[me.uid]) ?? 0
  const typers = typingUids(chat, me.uid, blocked)
  useTick(typers.length > 0)

  const visible = useMemo(() => messages.filter((m) => {
    const t = ms(m.createdAt) ?? Infinity
    return !m.deletedFor?.includes(me.uid) && t > clearedAt && !(isBlocked && m.senderId === otherId && t > blockedAt)
  }), [messages, me.uid, clearedAt, isBlocked, otherId, blockedAt])
  const lastVisibleId = visible.at(-1)?.id
  const lastId = chat.lastMessage?.id
  const myUnread = chat.unread?.[me.uid] || 0
  const receipts = me.readReceipts !== false

  const nameOf = (uid) => (uid === me.uid ? 'You' : (isGroup ? users[uid]?.username : other?.username) || '…')

  /* ---------- search ---------- */
  const term = q.trim()
  const results = useMemo(() => {
    if (!term) return []
    const t = term.toLowerCase()
    return visible
      .filter((m) => !m.deletedForEveryone && m.type !== 'call' && m.type !== 'system' &&
        `${m.text || ''} ${m.fileName || ''}`.toLowerCase().includes(t))
      .reverse()
  }, [term, visible])

  const openSearch = () => { setSearchOpen(true); loadAll() }
  const closeSearch = () => { setSearchOpen(false); setQ('') }
  const jump = (id) => {
    document.getElementById(`m-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setFlash(id)
    setTimeout(() => setFlash(null), 2200)
  }

  /* ---------- read state ---------- */
  useEffect(() => {
    const run = () => { if (!document.hidden) markRead(chat.id, me.uid, receipts).catch(() => {}) }
    if (lastId || myUnread) run()
    document.addEventListener('visibilitychange', run)
    return () => document.removeEventListener('visibilitychange', run)
  }, [chat.id, lastId, myUnread, receipts, me.uid])

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth' }) }, [lastVisibleId])

  const isRead = (m) =>
    receipts && others.length > 0 && others.every((id) => (ms(chat.lastRead?.[id]) ?? 0) >= (ms(m.createdAt) ?? Infinity))

  /* ---------- header text ---------- */
  const title = isGroup ? chat.name : other?.username || '…'
  const status = isGroup
    ? chat.members.map((id) => nameOf(id)).join(', ')
    : !other ? ''
    : isOnline(other) ? 'online'
    : other.lastSeen ? `last seen ${dayLabel(other.lastSeen).toLowerCase()} at ${fmtTime(other.lastSeen)}`
    : other.about

  const typingText = typers.length
    ? (isGroup ? `${typers.map(nameOf).join(', ')} ${typers.length > 1 ? 'are' : 'is'} typing…` : 'typing…')
    : null

  /* ---------- composing ---------- */
  const pickFile = (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (f.size > MAX_FILE) return setError(`File is too large (${fmtSize(f.size)}). Max is 25 MB.`)
    setError(''); setFile(f); setEditing(null)
  }

  const resetComposer = () => { setText(''); setReply(null); setEditing(null); setFile(null); setProgress(null); setEmojiOpen(false) }
  const replyData = () => (reply ? { replyTo: { id: reply.id, senderId: reply.senderId, text: previewText(reply) } } : {})

  const submit = async (e) => {
    e?.preventDefault()
    const t = text.trim()
    setError('')
    try {
      if (editing) {
        if (!t) return
        if (t !== editing.text) await editMessage(chat.id, editing, t, lastId === editing.id)
        return resetComposer()
      }
      if (!t && !file) return
      const data = { text: t, ...replyData() }
      if (file) {
        setProgress(0)
        const up = await uploadChatFile(file, setProgress)
        Object.assign(data, { type: kindOf(file), fileURL: up.url, fileName: file.name, fileSize: file.size, fileType: file.type })
      }
      resetTyping()
      resetComposer()
      await sendMessage(chat.id, me.uid, others, data)
    } catch (err) {
      setProgress(null)
      setError(`Could not send: ${friendlyError(err)}`)
    }
  }

  const sendVoice = async (voice, seconds) => {
    setRecording(false); setError('')
    try {
      setProgress(0)
      const up = await uploadChatFile(voice, setProgress)
      setProgress(null)
      await sendMessage(chat.id, me.uid, others, {
        type: 'voice', fileURL: up.url, fileName: 'Voice message', fileSize: voice.size, fileType: voice.type,
        duration: seconds, ...replyData(),
      })
      setReply(null)
    } catch (err) {
      setProgress(null)
      setError(`Could not send voice message: ${friendlyError(err)}`)
    }
  }

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && window.matchMedia('(min-width: 768px)').matches) {
      e.preventDefault(); submit()
    }
  }

  /* ---------- typing indicator (sender) ---------- */
  const typing = useRef({ last: 0, timer: null })
  const stopTyping = () => {
    clearTimeout(typing.current.timer)
    if (typing.current.last) { typing.current.last = 0; setTyping(chat.id, me.uid, false) }
  }
  const resetTyping = () => { clearTimeout(typing.current.timer); typing.current.last = 0 } // sendMessage clears it server-side
  const pingTyping = () => {
    const s = typing.current
    if (Date.now() - s.last > 3000) { s.last = Date.now(); setTyping(chat.id, me.uid, true) }
    clearTimeout(s.timer)
    s.timer = setTimeout(stopTyping, 3000)
  }
  useEffect(() => () => stopTyping(), []) 
  useEffect(() => { if (typers.length) bottom.current?.scrollIntoView({ behavior: 'smooth' }) }, [typers.length])

  /* ---------- header menu: clear / delete / block ---------- */
  const [menu, setMenu] = useState(false)
  const doClear = () => { setMenu(false); window.confirm('Clear all messages in this chat? This only affects you.') && clearChat(chat.id, me.uid) }
  const doDelete = () => {
    setMenu(false)
    window.confirm(`Delete your chat with ${other?.username}? They are removed from your list and your history is cleared. They can still message you.`)
      && deleteChat(chat.id, me.uid).then(onBack)
  }
  const doBlock = () => {
    setMenu(false)
    window.confirm(`Block ${other?.username}? You will stop receiving their messages and calls.`) && blockUser(me.uid, otherId)
  }
  const itemCls = 'block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-bg'

  const startEdit = (m) => { setEditing(m); setReply(null); setFile(null); setText(m.text); area.current?.focus() }
  const delAll = (m) => window.confirm('Delete this message for everyone?') && deleteForEveryone(chat.id, m, lastId === m.id)
  const delMe = (m) => window.confirm('Delete this message for you?') && deleteForMe(chat.id, m.id, me.uid)
  const showMic = !text.trim() && !file && !editing

  let prevDay = null
  return (
    <>
      <header className="relative flex items-center gap-2 border-b border-line bg-surface px-3 py-3 sm:gap-3 sm:px-4">
        <button onClick={onBack} aria-label="Back" className="rounded-lg border border-line px-3 py-2 text-sm md:hidden">←</button>
        <button onClick={() => isGroup && setInfo(true)} className={`flex min-w-0 flex-1 items-center gap-3 text-left ${isGroup ? '' : 'cursor-default'}`}>
          <Avatar user={isGroup ? chat : other} size="h-10 w-10" />
          <span className="min-w-0">
            <span className="block truncate font-bold">{title}</span>
            <span className={`block truncate text-xs ${typingText ? 'font-semibold text-brand' : 'text-muted'}`}>{typingText || status}</span>
          </span>
        </button>
        <button onClick={searchOpen ? closeSearch : openSearch} aria-label="Search messages"
          className={`grid h-10 w-10 place-items-center rounded-full border text-lg hover:border-brand ${searchOpen ? 'border-brand' : 'border-line'}`}>🔍</button>
        {!isGroup && !isBlocked && (
          <>
            <button onClick={() => onCall(otherId, 'audio')} aria-label="Voice call" className="grid h-10 w-10 place-items-center rounded-full border border-line text-lg hover:border-brand">📞</button>
          </>
        )}
        <button onClick={() => setMenu((v) => !v)} aria-label="More options" aria-expanded={menu}
          className="grid h-10 w-10 place-items-center rounded-full border border-line text-lg hover:border-brand">⋮</button>
        {menu && (
          <>
            <button aria-label="Close menu" className="fixed inset-0 z-20 cursor-default" onClick={() => setMenu(false)} />
            <div className="absolute right-3 top-full z-30 mt-1 w-56 rounded-2xl border border-line bg-surface p-2 shadow-xl">
              {isGroup && <button className={itemCls} onClick={() => { setMenu(false); setInfo(true) }}>ⓘ Group info</button>}
              <button className={itemCls} onClick={doClear}>🧹 Clear chat</button>
              {!isGroup && <button className={itemCls} onClick={doDelete}>🗑 Delete chat</button>}
              {!isGroup && (isBlocked
                ? <button className={itemCls} onClick={() => { setMenu(false); unblockUser(me.uid, otherId) }}>✅ Unblock</button>
                : <button className={`${itemCls} text-red-500`} onClick={doBlock}>🚫 Block</button>)}
            </div>
          </>
        )}
      </header>

      {searchOpen && (
        <div className="border-b border-line bg-surface px-3 py-2 sm:px-4">
          <div className="flex items-center gap-2">
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search in this chat"
              className="min-w-0 flex-1 rounded-full border border-line bg-bg px-4 py-2 text-sm outline-none focus:border-brand" />
            <button onClick={closeSearch} aria-label="Close search" className="rounded-full border border-line px-3 py-1.5 text-sm">✕</button>
          </div>
          {term && (
            <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-line scroll-thin">
              {results.length === 0 ? (
                <p className="p-3 text-sm text-muted">No messages found for “{term}”.</p>
              ) : (
                <>
                  <p className="border-b border-line px-3 py-1.5 text-xs text-muted">{results.length} result{results.length > 1 && 's'}</p>
                  {results.map((m) => {
                    const src = m.text || m.fileName || ''
                    return (
                      <button key={m.id} onClick={() => jump(m.id)} className="block w-full border-b border-line px-3 py-2 text-left last:border-0 hover:bg-bg">
                        <span className="flex justify-between gap-2 text-xs text-muted">
                          <span className="font-semibold">{nameOf(m.senderId)}</span>
                          <span>{dayLabel(m.createdAt)}, {fmtTime(m.createdAt)}</span>
                        </span>
                        <span className="block truncate text-sm"><Hl text={snippet(src, term)} q={term} /></span>
                      </button>
                    )
                  })}
                </>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex-1 space-y-2 overflow-y-auto px-3 py-4 scroll-thin sm:px-6">
        {hasMore && (
          <div className="text-center">
            <button onClick={loadMore} className="rounded-full border border-line px-4 py-1 text-xs text-muted hover:border-brand">Load older messages</button>
          </div>
        )}
        {visible.length === 0 && <p className="py-16 text-center text-muted">No messages yet. Say hello 👋</p>}

        {visible.map((m) => {
          const day = dayLabel(m.createdAt)
          const sep = day !== prevDay
          prevDay = day
          const mine = m.senderId === me.uid
          return (
            <div key={m.id} className="space-y-2">
              {sep && (
                <div className="flex justify-center py-1">
                  <span className="rounded-full border border-line bg-surface px-3 py-1 text-xs text-muted">{day}</span>
                </div>
              )}
              <MessageBubble
                msg={m} mine={mine} me={me.uid} read={mine && isRead(m)}
                senderName={isGroup ? users[m.senderId]?.username : null}
                highlight={flash === m.id}
                onReact={(msg, emoji) => toggleReaction(chat.id, msg, me.uid, emoji)}
                onReply={(msg) => { setReply(msg); setEditing(null); area.current?.focus() }}
                onEdit={startEdit} onDeleteMe={delMe} onDeleteAll={delAll} onMedia={setViewer}
              />
            </div>
          )
        })}
        {typers.length > 0 && (
          <div className="flex justify-start" aria-live="polite">
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-line bg-surface px-4 py-3" aria-label="typing">
              {[0, 1, 2].map((i) => (
                <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${i * 150}ms` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottom} />
      </div>

      <div className="relative border-t border-line bg-surface p-2 sm:p-3">
        {(reply || editing || file || error || progress !== null) && (
          <div className="mb-2 flex items-start gap-3 rounded-xl border border-line bg-bg px-3 py-2 text-sm">
            <div className="min-w-0 flex-1">
              {reply && <><b className="text-xs">Replying to {nameOf(reply.senderId)}</b><p className="truncate text-muted">{previewText(reply)}</p></>}
              {editing && <><b className="text-xs">Editing message</b><p className="truncate text-muted">{editing.text}</p></>}
              {file && (
                <div className="flex items-center gap-3">
                  {file.type.startsWith('image/') ? <img src={URL.createObjectURL(file)} alt="" className="h-12 w-12 rounded-lg object-cover" /> : <span className="text-2xl">📄</span>}
                  <div className="min-w-0"><p className="truncate font-semibold">{file.name}</p><p className="text-xs text-muted">{fmtSize(file.size)}</p></div>
                </div>
              )}
              {progress !== null && (
                <div className="mt-2">
                  <p className="text-xs text-muted">Uploading… {progress}%</p>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full bg-brand transition-all" style={{ width: `${progress}%` }} /></div>
                </div>
              )}
              {error && <p role="alert" className="text-red-500">{error}</p>}
            </div>
            {progress === null && (
              <button onClick={() => (error ? setError('') : resetComposer())} aria-label="Dismiss" className="text-muted hover:text-ink">✕</button>
            )}
          </div>
        )}

        {emojiOpen && (
          <div className="absolute bottom-full left-2 z-30 mb-2">
            <EmojiPicker onEmojiClick={(d) => setText((t) => t + d.emoji)} width={Math.min(320, window.innerWidth - 24)} height={380}
              theme={theme === 'midnight' ? 'dark' : 'light'} lazyLoadEmojis />
          </div>
        )}

        {isBlocked ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-bg px-4 py-3 text-sm">
            <span>🚫 You blocked {other?.username}. Unblock to send messages.</span>
            <button onClick={() => unblockUser(me.uid, otherId)} className="shrink-0 rounded-lg border border-line px-3 py-1.5 font-semibold hover:border-brand">Unblock</button>
          </div>
        ) : recording ? (
          <VoiceRecorder onSend={sendVoice} onCancel={() => setRecording(false)} />
        ) : (
          <form onSubmit={submit} className="flex items-end gap-2">
            <button type="button" onClick={() => setEmojiOpen((o) => !o)} aria-label="Emoji" className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-xl hover:bg-bg">😊</button>
            <button type="button" onClick={() => fileInput.current?.click()} aria-label="Attach file" className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-xl hover:bg-bg">📎</button>
            <input ref={fileInput} type="file" hidden onChange={pickFile} accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar" />
            <textarea
              ref={area} rows={1} value={text} onKeyDown={onKey}
              onChange={(e) => { setText(e.target.value); e.target.value.trim() ? pingTyping() : stopTyping(); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px' }}
              onFocus={() => setEmojiOpen(false)}
              placeholder={file ? 'Add a caption…' : editing ? 'Edit message…' : 'Type a message'}
              className="max-h-36 min-w-0 flex-1 resize-none rounded-2xl border border-line bg-bg px-4 py-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
            />
            {showMic ? (
              <button type="button" onClick={() => { setEmojiOpen(false); setRecording(true) }} aria-label="Record voice message"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand text-lg text-brand-ink">🎤</button>
            ) : (
              <button disabled={progress !== null} aria-label="Send"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand text-lg text-brand-ink disabled:opacity-60">
                {editing ? '✓' : '➤'}
              </button>
            )}
          </form>
        )}
      </div>

      {viewer && <Lightbox src={viewer.url} name={viewer.name} onClose={() => setViewer(null)} />}
      {info && <GroupInfoModal chat={chat} me={me} onClose={() => setInfo(false)} />}
    </>
  )
}
