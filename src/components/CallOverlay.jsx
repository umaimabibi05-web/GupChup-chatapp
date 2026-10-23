import { useEffect, useRef } from 'react'
import Avatar from './Avatar.jsx'
import useUserDoc from '../hooks/useUserDoc.js'
import { beep } from '../lib/sound.js'
import { fmtDuration } from '../lib/format.js'

export default function CallOverlay({ c }) {
  const { call, localStream, remoteStream, muted, camOff, seconds, accept, reject, hangup, toggleMute, toggleCam } = c
  const peer = useUserDoc(call.peerId)
  const remoteRef = useRef(null)
  const localRef = useRef(null)
  const video = false

  useEffect(() => { if (remoteRef.current) remoteRef.current.srcObject = remoteStream }, [remoteStream])
  useEffect(() => { if (localRef.current) localRef.current.srcObject = localStream }, [localStream])

  useEffect(() => {
    if (call.status !== 'ringing' && call.status !== 'calling') return
    beep(520, 0.4)
    const id = setInterval(() => beep(520, 0.4), 2000)
    return () => clearInterval(id)
  }, [call.status])

  const status = {
    calling: 'Calling…',
    ringing: `Incoming ${video ? 'video' : 'voice'} call`,
    connecting: 'Connecting…',
    active: fmtDuration(seconds),
  }[call.status]

  const showRemoteVideo = video && call.status === 'active'
  const Btn = ({ onClick, children, className = '', label }) => (
    <button onClick={onClick} aria-label={label}
      className={`grid h-14 w-14 place-items-center rounded-full text-2xl ${className}`}>{children}</button>
  )

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-between bg-black/95 p-6 text-white">
      <video ref={remoteRef} autoPlay playsInline className={showRemoteVideo ? 'absolute inset-0 h-full w-full object-cover' : 'hidden'} />
      {video && (
        <video ref={localRef} autoPlay playsInline muted
          className="absolute right-4 top-4 z-10 h-36 w-24 rounded-xl border border-white/20 bg-black object-cover sm:h-44 sm:w-32" />
      )}

      <div className="relative z-10 mt-10 flex flex-col items-center gap-3 text-center">
        {!showRemoteVideo && <Avatar user={peer} size="h-28 w-28" text="text-4xl" />}
        <h2 className="text-2xl font-bold drop-shadow">{peer?.username || '…'}</h2>
        <p className="text-white/80 drop-shadow">{status}</p>
      </div>

      <div className="relative z-10 mb-8 flex items-center gap-5">
        {call.status === 'ringing' ? (
          <>
            <Btn onClick={reject} label="Decline" className="bg-red-500">✕</Btn>
            <Btn onClick={accept} label="Accept" className="bg-green-500">📞</Btn>
          </>
        ) : (
          <>
            <Btn onClick={toggleMute} label="Mute" className={muted ? 'bg-white text-black' : 'bg-white/15'}>{muted ? '🔇' : '🎤'}</Btn>
            {video && <Btn onClick={toggleCam} label="Camera" className={camOff ? 'bg-white text-black' : 'bg-white/15'}>{camOff ? '🚫' : '📷'}</Btn>}
            <Btn onClick={hangup} label="End call" className="bg-red-500">✕</Btn>
          </>
        )}
      </div>
    </div>
  )
}
