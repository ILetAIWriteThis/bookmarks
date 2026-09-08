import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Icon } from '../icons'

interface TemporaryBookmarksProps {
  onClose: () => void
}

interface TemporaryBookmark {
  id: string
  title: string
  url: string
  createdAt: string
}

const storageKey = 'bookmarks-temporary-inbox-v1'

function readBookmarks(): TemporaryBookmark[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey) ?? '[]')
    if (!Array.isArray(value)) return []
    return value.filter((item): item is TemporaryBookmark => {
      let parsedUrl: URL
      if (!item || typeof item !== 'object') return false
      const bookmark = item as Partial<TemporaryBookmark>
      try { parsedUrl = new URL(bookmark.url ?? '') } catch { return false }
      return ['http:', 'https:'].includes(parsedUrl.protocol)
        && typeof bookmark.id === 'string'
        && typeof bookmark.title === 'string'
        && typeof bookmark.url === 'string'
        && typeof bookmark.createdAt === 'string'
    })
  } catch {
    return []
  }
}

function normalizeUrl(value: string) {
  const withProtocol = /^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`
  const url = new URL(withProtocol)
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Use an http or https link.')
  return url
}

function persistBookmarks(bookmarks: TemporaryBookmark[]) {
  localStorage.setItem(storageKey, JSON.stringify(bookmarks))
}

export function TemporaryBookmarks({ onClose }: TemporaryBookmarksProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [bookmarks, setBookmarks] = useState(readBookmarks)
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (typeof dialog.showModal === 'function') dialog.showModal()
    else dialog.setAttribute('open', '')
  }, [])

  const dismiss = () => {
    const dialog = dialogRef.current
    if (dialog && typeof dialog.close === 'function') {
      dialog.close()
      return
    }
    onClose()
  }

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    let parsedUrl: URL
    try {
      parsedUrl = normalizeUrl(url.trim())
    } catch (reason) {
      setError(reason instanceof Error && reason.message === 'Use an http or https link.'
        ? reason.message
        : 'Enter a valid web address.')
      return
    }

    if (bookmarks.some((bookmark) => bookmark.url === parsedUrl.href)) {
      setError('That link is already in your temporary inbox.')
      return
    }

    try {
      const bookmark: TemporaryBookmark = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        title: title.trim() || parsedUrl.hostname.replace(/^www\./, ''),
        url: parsedUrl.href,
        createdAt: new Date().toISOString(),
      }
      const next = [bookmark, ...bookmarks]
      persistBookmarks(next)
      setBookmarks(next)
      setUrl('')
      setTitle('')
    } catch {
      setError('This bookmark could not be saved to device storage.')
    }
  }

  const remove = (id: string) => {
    const next = bookmarks.filter((bookmark) => bookmark.id !== id)
    try {
      persistBookmarks(next)
      setBookmarks(next)
    } catch {
      setError('This bookmark could not be removed from device storage.')
    }
  }

  const clear = () => {
    if (!window.confirm(`Clear all ${bookmarks.length} temporary bookmarks?`)) return
    try {
      localStorage.removeItem(storageKey)
      setBookmarks([])
      setError('')
    } catch {
      setError('The temporary inbox could not be cleared.')
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="temporary-dialog"
      aria-labelledby="temporary-heading"
      onCancel={(event) => { event.preventDefault(); dismiss() }}
      onClose={onClose}
      onMouseDown={(event) => { if (event.target === event.currentTarget) dismiss() }}
    >
      <div className="temporary-dialog__header">
        <div>
          <p className="section-kicker">Save now · organize later</p>
          <h2 id="temporary-heading">Temporary inbox</h2>
        </div>
        <div className="temporary-dialog__actions">
          {bookmarks.length > 0 && (
            <button className="temporary-clear" type="button" onClick={clear}>Clear all</button>
          )}
          <button className="temporary-close" type="button" onClick={dismiss} aria-label="Close temporary inbox">
            <Icon name="close" size={20} />
          </button>
        </div>
      </div>

      <p className="temporary-intro">Keep a link on this device until you add it to your permanent collection.</p>
      <form className="temporary-form" onSubmit={save} aria-label="Add a temporary bookmark">
        <div className="temporary-field temporary-field--url">
          <label htmlFor="temporary-url">Link</label>
          <input
            id="temporary-url"
            type="text"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck="false"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="Paste a link"
            required
            autoFocus
          />
        </div>
        <div className="temporary-field">
          <label htmlFor="temporary-title">Name <span>optional</span></label>
          <input
            id="temporary-title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="What is it?"
          />
        </div>
        <button className="temporary-save" type="submit">
          <Icon name="plus" size={18} />
          Save for later
        </button>
      </form>
      {error && <p className="temporary-error" role="alert">{error}</p>}

      {bookmarks.length > 0 ? (
        <ul className="temporary-list" aria-label="Temporary bookmarks">
          {bookmarks.map((bookmark) => {
            const hostname = new URL(bookmark.url).hostname.replace(/^www\./, '')
            return (
              <li className="temporary-item" key={bookmark.id}>
                <a href={bookmark.url} target="_blank" rel="noopener noreferrer">
                  <span className="temporary-item__icon" aria-hidden="true">{bookmark.title.charAt(0).toLocaleUpperCase()}</span>
                  <span className="temporary-item__copy">
                    <strong>{bookmark.title}</strong>
                    <span>{hostname}</span>
                  </span>
                  <Icon name="external" size={16} />
                </a>
                <button type="button" onClick={() => remove(bookmark.id)} aria-label={`Remove ${bookmark.title}`}>
                  <Icon name="close" size={18} />
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="temporary-empty">Links saved here stay on this device until you move or clear them.</p>
        )}
    </dialog>
  )
}
