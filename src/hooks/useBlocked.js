import { useEffect, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase.js'

export default function useBlocked(me) {
  const [blocked, setBlocked] = useState(() => new Map())
  useEffect(() => {
    return onSnapshot(collection(db, 'users', me, 'blocks'), (snap) => {
      setBlocked(new Map(snap.docs.map((d) => [d.id, d.data({ serverTimestamps: 'estimate' }).blockedAt?.toMillis?.() ?? Date.now()])))
    })
  }, [me])
  return blocked
}
