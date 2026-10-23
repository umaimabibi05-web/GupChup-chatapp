import { useEffect, useRef, useState } from 'react'
import {
  addDoc, collection, doc, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where,
} from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { chatIdFor, logCall } from '../lib/chatApi.js'

const env = import.meta.env
const ICE = {
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
    ...(env.VITE_TURN_URL ? [{ urls: env.VITE_TURN_URL, username: env.VITE_TURN_USER, credential: env.VITE_TURN_PASS }] : []),
  ],
}

const getMedia = (type) =>
  navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' ? { facingMode: 'user' } : false })

export default function useCall(me, blockedRef) {
  const [call, setCall] = useState(null) 
  const [localStream, setLocalStream] = useState(null)
  const [remoteStream, setRemoteStream] = useState(null)
  const [muted, setMuted] = useState(false)
  const [camOff, setCamOff] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const r = useRef({})

  const teardown = () => {
    const s = r.current
    s.unsubs?.forEach((u) => u())
    clearTimeout(s.timeout)
    clearInterval(s.timer)
    s.local?.getTracks().forEach((t) => t.stop())
    s.pc?.close()
    r.current = {}
    setCall(null); setLocalStream(null); setRemoteStream(null)
    setMuted(false); setCamOff(false); setSeconds(0)
  }

  const finish = async (status) => {
    const s = r.current
    if (!s.callId || s.done) return
    s.done = true
    try { await updateDoc(doc(db, 'calls', s.callId), { status }) } catch { /* ignore */ }
    if (s.direction === 'out') {
      const secs = s.startedAt ? Math.round((Date.now() - s.startedAt) / 1000) : 0
      const outcome = s.startedAt ? 'ended' : status === 'rejected' ? 'declined' : 'missed'
      logCall(chatIdFor(me, s.peerId), me, s.peerId, s.type, outcome, secs).catch(() => {})
    }
    teardown()
  }

  const makePc = (stream) => {
    const pc = new RTCPeerConnection(ICE)
    stream.getTracks().forEach((t) => pc.addTrack(t, stream))
    pc.ontrack = (e) => setRemoteStream(e.streams[0])
    pc.onconnectionstatechange = () => {
      const s = r.current
      if (pc.connectionState === 'connected' && !s.startedAt) {
        s.startedAt = Date.now()
        clearTimeout(s.timeout)
        setCall((c) => c && { ...c, status: 'active' })
        s.timer = setInterval(() => setSeconds(Math.floor((Date.now() - s.startedAt) / 1000)), 1000)
      }
      if (pc.connectionState === 'failed') finish('ended')
    }
    return pc
  }

  /* ---------- incoming calls ---------- */
  useEffect(() => {
    if (!me) return
    const q = query(collection(db, 'calls'), where('calleeId', '==', me), where('status', '==', 'ringing'))
    return onSnapshot(q, (snap) => {
      snap.docChanges().forEach((ch) => {
        if (ch.type !== 'added') return
        const d = ch.doc.data()
        const created = d.createdAt?.toMillis?.() ?? Date.now()
        if (Date.now() - created > 60_000) return 
        if (blockedRef?.current?.has(d.callerId)) return 
        if (r.current.callId) { updateDoc(ch.doc.ref, { status: 'rejected' }); return } 
        r.current = { callId: ch.doc.id, direction: 'in', peerId: d.callerId, type: d.type, offer: d.offer, unsubs: [] }
        setCall({ id: ch.doc.id, peerId: d.callerId, type: d.type, direction: 'in', status: 'ringing' })
        r.current.unsubs.push(onSnapshot(ch.doc.ref, (s) => {
          const x = s.data()
          if (x && ['ended', 'missed', 'rejected'].includes(x.status)) finish(x.status)
        }))
      })
    })
  }, [me])

  /* ---------- start (caller) ---------- */
  const startCall = async (peerId, type) => {
    if (r.current.callId || r.current.starting) return
    const s = (r.current = { direction: 'out', peerId, type, unsubs: [], pending: [], starting: true })
    try {
      const stream = await getMedia(type)
      s.local = stream
      setLocalStream(stream)
      const pc = makePc(stream)
      s.pc = pc
      const callRef = doc(collection(db, 'calls'))
      s.callId = callRef.id
      setCall({ id: callRef.id, peerId, type, direction: 'out', status: 'calling' })

      const offer = await pc.createOffer()
      await setDoc(callRef, {
        callerId: me, calleeId: peerId, type, status: 'ringing',
        offer: { type: offer.type, sdp: offer.sdp }, createdAt: serverTimestamp(),
      })
      pc.onicecandidate = (e) => e.candidate && addDoc(collection(callRef, 'callerCandidates'), e.candidate.toJSON())
      await pc.setLocalDescription(offer)

      s.unsubs.push(onSnapshot(callRef, async (snap) => {
        const d = snap.data()
        if (!d) return
        if (['ended', 'missed', 'rejected'].includes(d.status)) { finish(d.status); return }
        if (d.answer && !s.gotAnswer) {
          s.gotAnswer = true
          await pc.setRemoteDescription(new RTCSessionDescription(d.answer))
          s.pending.forEach((c) => pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {}))
          s.pending = []
          setCall((c) => c && { ...c, status: 'connecting' })
        }
      }))
      s.unsubs.push(onSnapshot(collection(callRef, 'calleeCandidates'), (snap) => {
        snap.docChanges().forEach((c) => {
          if (c.type !== 'added') return
          if (pc.remoteDescription) pc.addIceCandidate(new RTCIceCandidate(c.doc.data())).catch(() => {})
          else s.pending.push(c.doc.data())
        })
      }))
      s.timeout = setTimeout(() => { if (!s.startedAt) finish('missed') }, 45_000)
    } catch (e) {
      console.error(e)
      alert('Could not start the call. Allow microphone/camera access and try again.')
      s.callId ? finish('missed') : teardown()
    }
  }

  /* ---------- accept (callee) ---------- */
  const accept = async () => {
    const s = r.current
    try {
      const stream = await getMedia(s.type)
      s.local = stream
      setLocalStream(stream)
      const pc = makePc(stream)
      s.pc = pc
      const callRef = doc(db, 'calls', s.callId)
      pc.onicecandidate = (e) => e.candidate && addDoc(collection(callRef, 'calleeCandidates'), e.candidate.toJSON())
      await pc.setRemoteDescription(new RTCSessionDescription(s.offer))
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      await updateDoc(callRef, { answer: { type: answer.type, sdp: answer.sdp }, status: 'active' })
      s.unsubs.push(onSnapshot(collection(callRef, 'callerCandidates'), (snap) => {
        snap.docChanges().forEach((c) => {
          if (c.type === 'added') pc.addIceCandidate(new RTCIceCandidate(c.doc.data())).catch(() => {})
        })
      }))
      setCall((c) => c && { ...c, status: 'connecting' })
    } catch (e) {
      console.error(e)
      alert('Could not access your microphone/camera.')
      finish('rejected')
    }
  }

  const reject = () => finish('rejected')
  const hangup = () => {
    const s = r.current
    finish(s.startedAt ? 'ended' : s.direction === 'out' ? 'missed' : 'rejected')
  }
  const toggleMute = () => {
    r.current.local?.getAudioTracks().forEach((t) => { t.enabled = muted })
    setMuted(!muted)
  }
  const toggleCam = () => {
    r.current.local?.getVideoTracks().forEach((t) => { t.enabled = camOff })
    setCamOff(!camOff)
  }

  return { call, localStream, remoteStream, muted, camOff, seconds, startCall, accept, reject, hangup, toggleMute, toggleCam }
}
