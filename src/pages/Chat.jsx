import { useEffect, useRef, useState } from 'react'
import { serverTimestamp } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext.jsx'
import ChatList from '../components/ChatList.jsx'
import ChatWindow from '../components/ChatWindow.jsx'
import NewChatModal from '../components/NewChatModal.jsx'
import NewGroupModal from '../components/NewGroupModal.jsx'
import SettingsModal from '../components/SettingsModal.jsx'
import CallOverlay from '../components/CallOverlay.jsx'
import useChats from '../hooks/useChats.js'
import useCall from '../hooks/useCall.js'
import useBlocked from '../hooks/useBlocked.js'
import { openChat } from '../lib/chatApi.js'
import { presence, saveProfile } from '../lib/accountApi.js'
import { beep, desktopNotify } from '../lib/sound.js'

export default function Chat() {
  const { profile: me } = useAuth()
  const [activeId, setActiveId] = useState(null)
  const [settings, setSettings] = useState(false)
  const [newChat, setNewChat] = useState(false)
  const [newGroup, setNewGroup] = useState(false)
  const activeRef = useRef(null)
  activeRef.current = activeId
  const meRef = useRef(me)
  meRef.current = me

  const blocked = useBlocked(me.uid)
  const blockedRef = useRef(blocked)
  blockedRef.current = blocked

  const callApi = useCall(me.uid, blockedRef)

  const onIncoming = (chat) => {
    const p = meRef.current
    if (p.notifications === false) return
    if (chat.type !== 'group' && blockedRef.current.has(chat.lastMessage?.senderId)) return // blocked: no alert
    if (!(document.hidden || chat.id !== activeRef.current)) return
    if (p.sound !== false) beep()
    if (document.hidden) desktopNotify(chat.type === 'group' ? chat.name : 'New message', chat.lastMessage?.text || '')
  }
  const { chats: allChats, ready } = useChats(me.uid, onIncoming)
  const chats = allChats.filter((c) => !c.hidden?.[me.uid]) 
  const active = chats.find((c) => c.id === activeId)

  useEffect(() => {
    const set = (online) => {
      if (!presence.enabled) return
      saveProfile(me.uid, { online, lastSeen: serverTimestamp() }).catch(() => {})
    }
    const sync = () => set(!document.hidden)
    const beat = () => { if (!document.hidden) set(true) }
    const bye = () => set(false)
    sync()
    const id = setInterval(beat, 30_000)
    document.addEventListener('visibilitychange', sync)
    window.addEventListener('pagehide', bye)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', sync)
      window.removeEventListener('pagehide', bye)
      set(false)
    }
  }, [me.uid])

  const startWith = async (uid) => {
    const id = await openChat(me.uid, uid)
    setActiveId(id)
    setNewChat(false)
  }

  return (
    <div className="flex h-dvh overflow-hidden">
      <aside className={`${active ? 'hidden' : 'flex'} w-full shrink-0 flex-col border-r border-line bg-surface md:flex md:w-80 lg:w-96`}>
        <ChatList chats={chats} ready={ready} me={me} blocked={blocked} activeId={activeId}
          onSelect={setActiveId} onNew={() => setNewChat(true)} onNewGroup={() => setNewGroup(true)} onSettings={() => setSettings(true)} />
      </aside>

      <main className={`${active ? 'flex' : 'hidden'} min-w-0 flex-1 flex-col md:flex`}>
        {active ? (
          <ChatWindow key={active.id} chat={active} me={me} blocked={blocked}
            onBack={() => setActiveId(null)} onCall={callApi.startCall} />
        ) : (
          <div className="grid flex-1 place-items-center p-6 text-center text-muted">
            <div>
              <p className="text-5xl">💬</p>
              <p className="mt-3 text-lg font-semibold text-ink">Gup Chup</p>
              <p className="mt-1">Select a chat, tap ＋ to find a friend by phone number, or 👥 to start a group.</p>
            </div>
          </div>
        )}
      </main>

      {newChat && <NewChatModal me={me.uid} onClose={() => setNewChat(false)} onStart={startWith} />}
      {newGroup && <NewGroupModal me={me} chats={chats} onClose={() => setNewGroup(false)}
        onCreated={(id) => { setActiveId(id); setNewGroup(false) }} />}
      {settings && <SettingsModal me={me} blocked={blocked} onClose={() => setSettings(false)} />}
      {callApi.call && <CallOverlay c={callApi} />}
    </div>
  )
}
