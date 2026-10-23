import {
  arrayRemove, arrayUnion, collection, deleteDoc, deleteField, doc, getDoc, increment, serverTimestamp, setDoc, updateDoc,
} from 'firebase/firestore'
import { db } from './firebase.js'
import { uploadToCloudinary } from './cloudinary.js'
import { normalizePhone } from './phone.js'

export const chatIdFor = (a, b) => [a, b].sort().join('_')
export const MAX_FILE = 25 * 1024 * 1024
const dur = (s = 0) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

export function previewText(m) {
  if (m.deletedForEveryone) return 'This message was deleted'
  const labels = {
    image: '📷 Photo', video: '🎥 Video', audio: '🎵 Audio',
    voice: `🎤 Voice message${m.duration ? ` (${dur(m.duration)})` : ''}`,
    file: `📎 ${m.fileName || 'File'}`,
  }
  return labels[m.type] || m.text
}

/* ---------- lookup ---------- */
async function userByUid(uid) {
  const s = await getDoc(doc(db, 'users', uid))
  return s.exists() ? { uid: s.id, ...s.data() } : null
}
export async function findUserByPhone(phone) {
  const s = await getDoc(doc(db, 'phones', phone))
  return s.exists() ? userByUid(s.data().uid) : null
}
export async function findUserByUsername(name) {
  const s = await getDoc(doc(db, 'usernames', name.toLowerCase()))
  return s.exists() ? userByUid(s.data().uid) : null
}

export async function lookupUser(raw) {
  const q = raw.trim()
  if (/[a-zA-Z_]/.test(q)) return findUserByUsername(q)
  const phone = normalizePhone(q)
  if (!phone) throw new Error('INVALID_PHONE')
  return findUserByPhone(phone)
}

/* ---------- chats ---------- */
export async function openChat(me, other) {
  const id = chatIdFor(me, other)
  const ref = doc(db, 'chats', id)
  const snap = await getDoc(ref)
  if (!snap.exists()) await setDoc(ref, { type: 'direct', members: [me, other].sort(), updatedAt: serverTimestamp() })
  else if (snap.data().hidden?.[me]) await updateDoc(ref, { [`hidden.${me}`]: deleteField() })
  return id
}

export function markRead(chatId, me, sendReceipt) {
  const patch = { [`unread.${me}`]: 0 }
  if (sendReceipt) patch[`lastRead.${me}`] = serverTimestamp()
  return updateDoc(doc(db, 'chats', chatId), patch)
}

/* ---------- messages ---------- */
export async function sendMessage(chatId, me, others, data, { count = true } = {}) {
  const msgRef = doc(collection(db, 'chats', chatId, 'messages'))
  const msg = {
    senderId: me, type: 'text', text: '', reactions: {}, deletedFor: [],
    deletedForEveryone: false, edited: false, createdAt: serverTimestamp(), ...data,
  }
  await setDoc(msgRef, msg)
  const patch = {
    lastMessage: { id: msgRef.id, senderId: me, type: msg.type, text: previewText(msg) },
    updatedAt: serverTimestamp(),
  }
  if (count) others.forEach((o) => { patch[`unread.${o}`] = increment(1) })
  if (data.type !== 'system') others.forEach((o) => { patch[`hidden.${o}`] = deleteField() })
  patch[`typing.${me}`] = deleteField()
  await updateDoc(doc(db, 'chats', chatId), patch)
}

export async function editMessage(chatId, msg, newText, isLast) {
  await updateDoc(doc(db, 'chats', chatId, 'messages', msg.id), { text: newText, edited: true })
  if (isLast) await updateDoc(doc(db, 'chats', chatId), { 'lastMessage.text': newText })
}

export const deleteForMe = (chatId, msgId, me) =>
  updateDoc(doc(db, 'chats', chatId, 'messages', msgId), { deletedFor: arrayUnion(me) })

export async function deleteForEveryone(chatId, msg, isLast) {
  await updateDoc(doc(db, 'chats', chatId, 'messages', msg.id), {
    deletedForEveryone: true, text: '', fileURL: '', fileName: '', fileSize: 0, fileType: '', duration: 0,
  })
  if (isLast) await updateDoc(doc(db, 'chats', chatId), { 'lastMessage.text': 'This message was deleted' })
}

export function toggleReaction(chatId, msg, me, emoji) {
  const mine = msg.reactions?.[me]
  return updateDoc(doc(db, 'chats', chatId, 'messages', msg.id), {
    [`reactions.${me}`]: mine === emoji ? deleteField() : emoji,
  })
}

export const uploadChatFile = (file, onProgress) => uploadToCloudinary(file, onProgress)

export function logCall(chatId, me, other, callType, outcome, seconds) {
  const label = callType === 'video' ? 'video call' : 'voice call'
  const text =
    outcome === 'ended' ? `${callType === 'video' ? 'Video' : 'Voice'} call · ${dur(seconds)}`
    : outcome === 'declined' ? `Declined ${label}`
    : `Missed ${label}`
  return sendMessage(chatId, me, [other], { type: 'call', text }, { count: false })
}

/* ---------- groups ---------- */
const sys = (chatId, me, text) => sendMessage(chatId, me, [], { type: 'system', text }, { count: false })

export async function createGroup({ me, myName, name, description, photoURL, memberIds }) {
  const ref = doc(collection(db, 'chats'))
  const members = [...new Set([me, ...memberIds])]
  await setDoc(ref, {
    type: 'group', name, description: description || '', photoURL: photoURL || '',
    members, admins: [me], createdBy: me, updatedAt: serverTimestamp(),
  })
  await sys(ref.id, me, `${myName} created the group "${name}"`)
  return ref.id
}

export async function updateGroupInfo(chatId, me, myName, patch) {
  await updateDoc(doc(db, 'chats', chatId), patch)
  if (patch.name) await sys(chatId, me, `${myName} changed the group name to "${patch.name}"`)
  else if (patch.photoURL) await sys(chatId, me, `${myName} changed the group photo`)
}

export async function addMembers(chatId, me, myName, users) {
  await updateDoc(doc(db, 'chats', chatId), { members: arrayUnion(...users.map((u) => u.uid)) })
  await sys(chatId, me, `${myName} added ${users.map((u) => u.username).join(', ')}`)
}

export async function removeMember(chatId, me, myName, user) {
  await updateDoc(doc(db, 'chats', chatId), { members: arrayRemove(user.uid), admins: arrayRemove(user.uid) })
  await sys(chatId, me, `${myName} removed ${user.username}`)
}

export const setAdmin = (chatId, uid, makeAdmin) =>
  updateDoc(doc(db, 'chats', chatId), { admins: makeAdmin ? arrayUnion(uid) : arrayRemove(uid) })

export async function leaveGroup(chat, me, myName) {
  const ref = doc(db, 'chats', chat.id)
  const members = chat.members.filter((id) => id !== me)
  if (members.length === 0) return deleteDoc(ref)
  let admins = (chat.admins || []).filter((id) => id !== me)
  if (admins.length === 0) admins = [members[0]] 
  await sys(chat.id, me, `${myName} left`) 
  await updateDoc(ref, { members, admins })
}

export const deleteGroup = (chatId) => deleteDoc(doc(db, 'chats', chatId))

/* ---------- typing indicator ---------- */
export const TYPING_TTL = 8000

export function typingUids(chat, me, blocked) {
  const now = Date.now()
  return Object.entries(chat.typing || {})
    .filter(([id, t]) => id !== me && !blocked?.has(id) && t?.toMillis && now - t.toMillis() < TYPING_TTL)
    .map(([id]) => id)
}

export const setTyping = (chatId, me, on) =>
  updateDoc(doc(db, 'chats', chatId), { [`typing.${me}`]: on ? serverTimestamp() : deleteField() }).catch(() => {})

/* ---------- clear / delete chat (only for me) ---------- */
export const clearChat = (chatId, me) =>
  updateDoc(doc(db, 'chats', chatId), { [`clearedAt.${me}`]: serverTimestamp(), [`unread.${me}`]: 0 })

export const deleteChat = (chatId, me) =>
  updateDoc(doc(db, 'chats', chatId), {
    [`hidden.${me}`]: true, [`clearedAt.${me}`]: serverTimestamp(), [`unread.${me}`]: 0,
  })

/* ---------- block ---------- */
export const blockUser = (me, uid) => setDoc(doc(db, 'users', me, 'blocks', uid), { blockedAt: serverTimestamp() })
export const unblockUser = (me, uid) => deleteDoc(doc(db, 'users', me, 'blocks', uid))
