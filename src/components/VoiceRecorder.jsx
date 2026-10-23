import { useEffect, useRef, useState } from 'react'
import { fmtDuration } from '../lib/format.js'

export default function VoiceRecorder({ onSend, onCancel }) {
  const [secs, setSecs] = useState(0)
  const secsRef = useRef(0)
  const rec = useRef(null)
  const stream = useRef(null)
  const timer = useRef(null)
  const chunks = useRef([])
  const cancelled = useRef(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: true })
        if (!alive) { s.getTracks().forEach((t) => t.stop()); return }
        stream.current = s
        const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
          .find((m) => window.MediaRecorder?.isTypeSupported?.(m))
        const mr = new MediaRecorder(s, mime ? { mimeType: mime } : undefined)
        rec.current = mr
        mr.ondataavailable = (e) => e.data.size && chunks.current.push(e.data)
        mr.onstop = () => {
          s.getTracks().forEach((t) => t.stop())
          if (cancelled.current) return
          const type = (mr.mimeType || 'audio/webm').split(';')[0]
          const ext = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm'
          onSend(new File(chunks.current, `voice-${Date.now()}.${ext}`, { type }), secsRef.current)
        }
        mr.start()
        timer.current = setInterval(() => { secsRef.current += 1; setSecs(secsRef.current) }, 1000)
      } catch {
        alert('Microphone access is needed to record voice messages.')
        onCancel()
      }
    })()
    return () => {
      alive = false
      clearInterval(timer.current)
      if (rec.current && rec.current.state !== 'inactive') { cancelled.current = true; rec.current.stop() }
      else stream.current?.getTracks().forEach((t) => t.stop())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cancel = () => {
    cancelled.current = true
    if (rec.current && rec.current.state !== 'inactive') rec.current.stop()
    onCancel()
  }
  const send = () => {
    clearInterval(timer.current)
    if (secsRef.current < 1) return cancel()
    rec.current?.stop()
  }

  return (
    <div className="flex items-center gap-3 p-1">
      <button onClick={cancel} aria-label="Cancel recording" className="grid h-11 w-11 place-items-center rounded-full text-xl hover:bg-bg">🗑</button>
      <div className="flex flex-1 items-center gap-3 rounded-full border border-line bg-bg px-4 py-3">
        <span className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
        <span className="font-mono text-sm">{fmtDuration(secs)}</span>
        <span className="text-sm text-muted">Recording…</span>
      </div>
      <button onClick={send} aria-label="Send voice message" className="grid h-11 w-11 place-items-center rounded-full bg-brand text-lg text-brand-ink">➤</button>
    </div>
  )
}
