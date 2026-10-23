import { useEffect, useState } from 'react'
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../lib/firebase.js'

const PAGE = 60

export default function useMessages(chatId) {
  const [count, setCount] = useState(PAGE)
  const [messages, setMessages] = useState([])
  const [hasMore, setHasMore] = useState(false)

  useEffect(() => { setCount(PAGE); setMessages([]) }, [chatId])

  useEffect(() => {
    const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('createdAt', 'desc'), limit(count))
    return onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })).reverse())
      setHasMore(snap.size >= count)
    })
  }, [chatId, count])

  return {
    messages, hasMore,
    loadMore: () => setCount((c) => c + PAGE),
    loadAll: () => setCount(2000), 
  }
}
