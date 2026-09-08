import { Icon } from '../icons'

interface AppHeaderProps {
  onInstall?: () => void
  onOpenInbox: () => void
}

export function AppHeader({ onInstall, onOpenInbox }: AppHeaderProps) {
  return (
    <header className="app-header">
      <a className="brand" href="#/" aria-label="Bookmarks home">
        <span className="brand__mark"><Icon name="bookmark" size={19} /></span>
        <span>Bookmarks</span>
      </a>
      <div className="header-actions">
        <button className="inbox-button" type="button" onClick={onOpenInbox} aria-label="Open quick save">
          <Icon name="plus" size={17} />
          <span>Quick save</span>
        </button>
        {onInstall && <button className="install-button" type="button" onClick={onInstall}>Install app</button>}
      </div>
    </header>
  )
}
