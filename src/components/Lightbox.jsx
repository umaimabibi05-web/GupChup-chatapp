import { useEffect, useState } from 'react'

const asAttachment = (u) => (u.includes('res.cloudinary.com') ? u.replace('/upload/', '/upload/fl_attachment/') : u)

const extOf = (u) => (u.split('?')[0].match(/\.([a-z0-9]+)$/i)?.[1] || 'jpg').toLowerCase()

export default function Lightbox({ src, name, onClose }) {
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])

  const download = async (e) => {
    e.stopPropagation()
    if (busy) return
    setBusy(true)
    const fileName = name || `image-${Date.now()}.${extOf(src)}`
    try {
      const res = await fetch(src)
      if (!res.ok) throw new Error('fetch failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
    
      const a = document.createElement('a')
      a.href = asAttachment(src)
      a.download = fileName
      a.target = '_blank'
      a.rel = 'noopener noreferrer'
      document.body.appendChild(a)
      a.click()
      a.remove()
    } finally {
      setBusy(false)
    }
  }

  const btn = 'grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/30 disabled:opacity-60'

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4" onClick={onClose}>
      <div className="absolute right-4 top-4 z-10 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <button type="button" aria-label="Download image" title="Download" onClick={download} disabled={busy} className={btn}>
          {busy ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v12" /><path d="M7 11l5 5 5-5" /><path d="M5 21h14" />
            </svg>
          )}
        </button>
        <button type="button" aria-label="Close" title="Close" onClick={onClose} className={btn}>✕</button>
      </div>
      <img
        src={src}
        alt={name || ''}
        className="max-h-[80vh] max-w-[92vw] rounded-lg object-contain sm:max-w-[70vw]"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}
