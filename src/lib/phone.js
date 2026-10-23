const DEFAULT_CC = import.meta.env.VITE_DEFAULT_COUNTRY_CODE || '+92'

export function normalizePhone(input) {
  let s = String(input || '').trim().replace(/[^\d+]/g, '')
  if (!s) return null
  if (s.startsWith('+')) s = '+' + s.slice(1).replace(/\+/g, '')
  else if (s.startsWith('00')) s = '+' + s.slice(2)
  else if (s.startsWith('0')) s = DEFAULT_CC + s.slice(1)
  else if (s.length <= 10) s = DEFAULT_CC + s
  else s = '+' + s
  return /^\+[1-9]\d{7,14}$/.test(s) ? s : null
}
