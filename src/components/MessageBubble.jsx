import { useState } from 'react'
import { fmtSize, fmtTime, ms } from '../lib/format.js'

const QUICK = ['👍', '❤️', '😂', '😮', '😢', '🙏']
const EDIT_WINDOW = 15 * 60 * 1000

const asMp3 = (u) => (u.includes('res.cloudinary.com') ? u.replace(/\.[a-z0-9]+$/i, '.mp3') : u)

function Ticks({ msg, read }) {
  if (!msg.createdAt) return <span title="Sending">🕓</span>
  return <span className={read ? 'text-sky-300' : 'opacity-70'} title={read ? 'Read' : 'Sent'}>{read ? '✓✓' : '✓'}</span>
}

function Media({ msg, onMedia }) {
  if (msg.type === 'image')
    return <img src={msg.fileURL} alt={msg.fileName} loading="lazy" onClick={() => onMedia({ url: msg.fileURL, name: msg.fileName })}
      className="mb-1 max-h-60 w-full max-w-xs cursor-zoom-in rounded-xl object-cover" />
  if (msg.type === 'video')
    return <video src={msg.fileURL} controls preload="metadata" className="mb-1 max-h-72 w-full rounded-xl bg-black" />
  if (msg.type === 'voice')
    return (
      <div className="mb-1 flex items-center gap-2">
        <span className="text-xl">🎤</span>
        <audio controls preload="metadata" className="h-10 w-56 max-w-full">
          <source src={asMp3(msg.fileURL)} type="audio/mpeg" />
          <source src={msg.fileURL} />
        </audio>
      </div>
    )
  if (msg.type === 'audio')
    return <audio src={msg.fileURL} controls className="mb-1 w-64 max-w-full" />
  if (msg.type === 'file')
    return (
      <a href={msg.fileURL} target="_blank" rel="noopener noreferrer" download={msg.fileName}
        className="mb-1 flex items-center gap-3 rounded-xl bg-black/10 p-3 no-underline">
        <span className="text-2xl">📄</span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{msg.fileName}</span>
          <span className="block text-xs opacity-70">{fmtSize(msg.fileSize)} · tap to open</span>
        </span>
      </a>
    )
  return null
}

export default function MessageBubble({
  msg, mine, me, read, senderName, highlight,
  onReact, onReply, onEdit, onDeleteMe, onDeleteAll, onMedia,
}) {
  const [open, setOpen] = useState(false)

  if (msg.type === 'call' || msg.type === 'system') {
    const bad = msg.type === 'call' && (msg.text.startsWith('Missed') || msg.text.startsWith('Declined'))
    const icon = msg.type === 'system' ? '' : bad ? '📵 ' : '📞 '
    return (
      <div id={`m-${msg.id}`} className="flex justify-center">
        <span className="max-w-[90%] rounded-full border border-line bg-surface px-3 py-1 text-center text-xs text-muted">
          {icon}{msg.text}{msg.type === 'call' && ` · ${fmtTime(msg.createdAt)}`}
        </span>
      </div>
    )
  }

  const deleted = msg.deletedForEveryone
  const t = ms(msg.createdAt)
  const canEdit = mine && msg.type === 'text' && !deleted && t && Date.now() - t < EDIT_WINDOW
  const myReaction = msg.reactions?.[me]
  const groups = Object.values(msg.reactions || {}).reduce((a, e) => ({ ...a, [e]: (a[e] || 0) + 1 }), {})

  const act = (fn) => () => { setOpen(false); fn() }
  const item = 'block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-bg'

  return (
    <div id={`m-${msg.id}`} className={`group flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className="relative max-w-[85%] sm:max-w-[70%]">
        <div className={`rounded-2xl px-3 pb-1.5 pt-2 transition-shadow ${
          mine ? 'rounded-br-sm bg-mine text-mine-ink' : 'rounded-bl-sm border border-line bg-surface'
        } ${highlight ? 'ring-4 ring-yellow-400' : ''}`}>
          {senderName && !mine && <p className="mb-0.5 text-xs font-bold text-brand">{senderName}</p>}

          {msg.replyTo && !deleted && (
            <div className="mb-1 rounded-lg border-l-4 border-white/40 bg-black/10 px-2 py-1 text-xs opacity-90">
              <span className="line-clamp-2">{msg.replyTo.text}</span>
            </div>
          )}

          {deleted ? (
            <p className="text-sm italic opacity-70">🚫 This message was deleted</p>
          ) : (
            <>
              <Media msg={msg} onMedia={onMedia} />
              {msg.text && <p className="whitespace-pre-wrap break-words">{msg.text}</p>}
            </>
          )}

          <div className="mt-0.5 flex items-center justify-end gap-1 text-[11px] opacity-80">
            {msg.edited && !deleted && <span>edited</span>}
            <span>{fmtTime(msg.createdAt)}</span>
            {mine && !deleted && <Ticks msg={msg} read={read} />}
          </div>
        </div>

        <button onClick={() => setOpen((o) => !o)} aria-label="Message options"
          className={`absolute -top-2 ${mine ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'} grid h-7 w-7 place-items-center rounded-full border border-line bg-surface text-xs text-ink shadow md:opacity-0 md:group-hover:opacity-100 focus:opacity-100`}>
          ⌄
        </button>

        {Object.keys(groups).length > 0 && (
          <div className={`-mt-1.5 flex ${mine ? 'justify-end' : 'justify-start'} gap-1 px-2`}>
            {Object.entries(groups).map(([e, n]) => (
              <button key={e} onClick={() => onReact(msg, e)}
                className={`rounded-full border bg-surface px-1.5 py-0.5 text-xs shadow-sm ${myReaction === e ? 'border-brand' : 'border-line'}`}>
                {e}{n > 1 && ` ${n}`}
              </button>
            ))}
          </div>
        )}

        {open && (
          <>
            <button aria-label="Close menu" className="fixed inset-0 z-20 cursor-default" onClick={() => setOpen(false)} />
            <div className={`absolute top-6 z-30 w-56 rounded-2xl border border-line bg-surface p-2 text-ink shadow-xl ${mine ? 'right-0' : 'left-0'}`}>
              {!deleted && (
                <div className="mb-1 flex justify-between border-b border-line px-1 pb-2">
                  {QUICK.map((e) => (
                    <button key={e} onClick={act(() => onReact(msg, e))}
                      className={`rounded-full p-1 text-xl hover:bg-bg ${myReaction === e ? 'bg-bg' : ''}`}>{e}</button>
                  ))}
                </div>
              )}
              {!deleted && <button className={item} onClick={act(() => onReply(msg))}>↩ Reply</button>}
              {!deleted && msg.text && (
                <button className={item} onClick={act(() => navigator.clipboard?.writeText(msg.text))}>⧉ Copy</button>
              )}
              {canEdit && <button className={item} onClick={act(() => onEdit(msg))}>✎ Edit</button>}
              <button className={item} onClick={act(() => onDeleteMe(msg))}>🗑 Delete for me</button>
              {mine && !deleted && (
                <button className={`${item} text-red-500`} onClick={act(() => onDeleteAll(msg))}>🗑 Delete for everyone</button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
