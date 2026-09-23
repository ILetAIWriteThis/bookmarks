import { Icon } from '../icons'

interface AppHeaderProps {
  onInstall?: () => void
}

export function AppHeader({ onInstall }: AppHeaderProps) {
  return (
    <header className="app-header">
      <a className="brand" href="#/" aria-label="Bookmarks home">
        <span className="brand__mark"><Icon name="bookmark" size={19} /></span>
        <span>Bookmarks</span>
      </a>
      <div className="header-actions">
        {onInstall && <button className="install-button" type="button" onClick={onInstall}>Install app</button>}
      </div>
    </header>
  )
}
