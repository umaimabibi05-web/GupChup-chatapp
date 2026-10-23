import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { ms } from '../lib/format.js'

export default function useUserDoc(uid) {
  const [u, setU] = useState(null)
  const [, tick] = useState(0)

  useEffect(() => {
    if (!uid) { setU(null); return }
    return onSnapshot(doc(db, 'users', uid), (s) => setU(s.exists() ? { uid: s.id, ...s.data() } : null))
  }, [uid])

  useEffect(() => {
    const id = setInterval(() => tick((t) => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  return u
}

export const isOnline = (u) => {
  const t = ms(u?.lastSeen)
  return u?.online === true && t != null && Date.now() - t < 75_000
}
