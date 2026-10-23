import { useEffect, useRef, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase.js'

export default function useChats(me, onIncoming) {
  const [chats, setChats] = useState([])
  const [ready, setReady] = useState(false)
  const cb = useRef(onIncoming)
  cb.current = onIncoming

  useEffect(() => {
    const seen = {}
    let first = true
    const q = query(collection(db, 'chats'), where('members', 'array-contains', me))
    return onSnapshot(q, (snap) => {
      snap.docChanges().forEach((c) => {
        if (c.type === 'removed') return
        const d = c.doc.data()
        const lastId = d.lastMessage?.id
        if (!first && lastId && seen[c.doc.id] !== lastId && d.lastMessage.senderId !== me && !['call', 'system'].includes(d.lastMessage.type)) {
          cb.current?.({ id: c.doc.id, ...d })
        }
        seen[c.doc.id] = lastId
      })
      first = false
      setChats(snap.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) })))
      setReady(true)
    })
  }, [me])

  return { chats, ready }
}
