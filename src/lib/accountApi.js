import {
  EmailAuthProvider, createUserWithEmailAndPassword, deleteUser, reauthenticateWithCredential,
  sendPasswordResetEmail, signInWithEmailAndPassword, signOut, updatePassword,
} from 'firebase/auth'
import { doc, runTransaction, serverTimestamp, updateDoc } from 'firebase/firestore'
import { auth, db } from './firebase.js'
import { uploadToCloudinary } from './cloudinary.js'

export const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/

export const presence = { enabled: true }

export async function signUp({ username, email, password, phone }) {
  presence.enabled = true
  const lower = username.toLowerCase()
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  const uid = cred.user.uid
  try {
    await runTransaction(db, async (tx) => {
      const uRef = doc(db, 'usernames', lower)
      const pRef = doc(db, 'phones', phone)
      if ((await tx.get(uRef)).exists()) throw new Error('USERNAME_TAKEN')
      if ((await tx.get(pRef)).exists()) throw new Error('PHONE_TAKEN')
      tx.set(uRef, { uid })
      tx.set(pRef, { uid })
      tx.set(doc(db, 'users', uid), {
        uid, username, usernameLower: lower, email, phone,
        about: 'Hey there! I am using Gup Chup.',
        photoURL: '', readReceipts: true, notifications: true, sound: true,
        online: false, createdAt: serverTimestamp(), lastSeen: serverTimestamp(),
      })
    })
  } catch (e) {
    await deleteUser(cred.user).catch(() => {})
    throw e
  }
}

export async function logIn(email, password) {
  presence.enabled = true
  return signInWithEmailAndPassword(auth, email, password)
}

export async function logOut(uid) {
  presence.enabled = false
  try { await updateDoc(doc(db, 'users', uid), { online: false, lastSeen: serverTimestamp() }) } catch { /* ignore */ }
  await signOut(auth)
}

export const resetPassword = (email) => sendPasswordResetEmail(auth, email)

export async function changePassword(current, next) {
  const u = auth.currentUser
  await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, current))
  await updatePassword(u, next)
}

export const saveProfile = (uid, patch) => updateDoc(doc(db, 'users', uid), patch)

export async function changeUsername(uid, oldName, newName) {
  const o = oldName.toLowerCase()
  const n = newName.toLowerCase()
  if (o === n) return saveProfile(uid, { username: newName })
  await runTransaction(db, async (tx) => {
    const nRef = doc(db, 'usernames', n)
    if ((await tx.get(nRef)).exists()) throw new Error('USERNAME_TAKEN')
    tx.set(nRef, { uid })
    tx.delete(doc(db, 'usernames', o))
    tx.update(doc(db, 'users', uid), { username: newName, usernameLower: n })
  })
}

export async function uploadAvatar(file) {
  return (await uploadToCloudinary(file)).url
}
