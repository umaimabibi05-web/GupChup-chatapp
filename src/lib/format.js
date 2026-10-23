export const ms = (ts) => (ts?.toMillis ? ts.toMillis() : null)
export const fmtTime = (ts) =>
  new Date(ms(ts) ?? Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

export function dayLabel(ts) {
  const d = new Date(ms(ts) ?? Date.now())
  const today = new Date()
  const yest = new Date(); yest.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yest.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })
}

export const fmtSize = (b = 0) =>
  b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1048576).toFixed(1)} MB`

export const fmtDuration = (s = 0) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

export const kindOf = (f) =>
  f.type.startsWith('image/') ? 'image'
  : f.type.startsWith('video/') ? 'video'
  : f.type.startsWith('audio/') ? 'audio' : 'file'

export function friendlyError(e) {
  const map = {
    'auth/email-already-in-use': 'This email is already registered. Try logging in.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/invalid-credential': 'Wrong email or password.',
    'auth/user-not-found': 'Wrong email or password.',
    'auth/wrong-password': 'Wrong email or password.',
    'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
    'auth/network-request-failed': 'Network error. Check your internet connection.',
    'auth/requires-recent-login': 'Please log in again and retry.',
    'permission-denied': 'Permission denied. Check that the Firestore/Storage rules are published.',
    USERNAME_TAKEN: 'That username is already taken.',
    PHONE_TAKEN: 'That phone number is already registered.',
  }
  return map[e?.code] || map[e?.message] || e?.message || 'Something went wrong.'
}
