import { createContext, useContext, useEffect, useState } from 'react'

export const THEMES = [
  { id: 'ocean', label: 'Ocean', color: '#0e7490' },
  { id: 'sunset', label: 'Sunset', color: '#d95426' },
  { id: 'forest', label: 'Forest', color: '#26783e' },
  { id: 'rose', label: 'Rose', color: '#be2660' },
  { id: 'midnight', label: 'Midnight', color: '#818cf8' },
]

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'ocean')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)
