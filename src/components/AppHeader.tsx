import { useEffect, useState } from 'react'
import { Icon } from '../icons'

interface AppHeaderProps {
  onInstall?: () => void
}

export function AppHeader({ onInstall }: AppHeaderProps) {
  const [dark, setDark] = useState(() => {
    try { const saved = localStorage.getItem('bookmarks:theme'); if (saved) return saved === 'dark' } catch { /* Use system preference. */ }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
  })
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    try { localStorage.setItem('bookmarks:theme', dark ? 'dark' : 'light') } catch { /* Theme still works for this session. */ }
  }, [dark])
  return (
    <header className="app-header">
      <a className="brand" href="#/" aria-label="Bookmarks home">
        <span className="brand__mark"><Icon name="bookmark" size={19} /></span>
        <span>Bookmarks</span>
      </a>
      <div className="header-actions">
        <button className="theme-toggle" aria-label="Dark mode" aria-pressed={dark} onClick={() => setDark(!dark)}>{dark ? '☀ Daylight' : '☾ Moonlight'}</button>
        <nav className="header-nav" aria-label="Main navigation"><a href="#/">Bookmarks</a></nav>
        {onInstall && <button className="install-button" type="button" onClick={onInstall}>Install app</button>}
      </div>
    </header>
  )
}
