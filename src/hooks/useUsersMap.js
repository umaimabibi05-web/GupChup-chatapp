import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase.js'

export default function useUsersMap(uids) {
  const key = [...new Set(uids)].sort().join(',')
  const [map, setMap] = useState({})
  useEffect(() => {
    const ids = key ? key.split(',') : []
    const unsubs = ids.map((id) =>
      onSnapshot(doc(db, 'users', id), (s) =>
        setMap((m) => ({ ...m, [id]: s.exists() ? { uid: s.id, ...s.data() } : null }))
      )
    )
    return () => unsubs.forEach((u) => u())
  }, [key])
  return map
}
