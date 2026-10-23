import { useEffect, useState } from 'react'

export default function useTick(enabled, every = 2000) {
  const [, set] = useState(0)
  useEffect(() => {
    if (!enabled) return
    const id = setInterval(() => set((x) => x + 1), every)
    return () => clearInterval(id)
  }, [enabled, every])
}
