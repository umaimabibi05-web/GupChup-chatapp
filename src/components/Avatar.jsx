export default function Avatar({ user, name, size = 'h-10 w-10', text = 'text-base' }) {
  const label = (user?.username || user?.name || name || '?')[0].toUpperCase()
  return user?.photoURL ? (
    <img src={user.photoURL} alt="" className={`${size} shrink-0 rounded-full object-cover`} />
  ) : (
    <span className={`grid ${size} ${text} shrink-0 place-items-center rounded-full bg-brand font-bold text-brand-ink`}>{label}</span>
  )
}
