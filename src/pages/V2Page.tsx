import { useEffect, useMemo, useState } from 'react'
import { normalizeSearch } from '../data'
import { Icon } from '../icons'
import type { BookmarkData } from '../types'
import { v2Bookmarks, type V2Collection } from '../v2'

export function V2Page({ data, collection }: { data: BookmarkData; collection: V2Collection }) {
  const collections = useMemo(() => ({ web: v2Bookmarks(data, 'web'), youtube: v2Bookmarks(data, 'youtube') }), [data])
  const [filters, setFilters] = useState<Record<V2Collection, string[]>>({ web: [], youtube: [] })
  const [queries, setQueries] = useState<Record<V2Collection, string>>({ web: '', youtube: '' })
  const entries = collections[collection]
  const tags = [...new Set(entries.flatMap((entry) => entry.tags))].sort((a, b) => a.localeCompare(b))
  const selected = filters[collection]
  const query = normalizeSearch(queries[collection]).replace(/^#/, '')
  const visible = entries.filter(({ bookmark, tags: bookmarkTags }) =>
    selected.every((tag) => bookmarkTags.includes(tag))
    && (!query || normalizeSearch([bookmark.title, bookmark.description ?? '', bookmark.url, ...bookmarkTags].join(' ')).includes(query)))
  const title = collection === 'web' ? 'Web' : 'YouTube'
  const toggleTag = (tag: string) => setFilters((current) => ({
    ...current,
    [collection]: current[collection].includes(tag)
      ? current[collection].filter((item) => item !== tag) : [...current[collection], tag],
  }))

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement
      if (target.matches('input, textarea, select, [contenteditable="true"]')) return
      event.preventDefault()
      document.getElementById('v2-search')?.focus()
    }
    window.addEventListener('keydown', focusSearch)
    return () => window.removeEventListener('keydown', focusSearch)
  }, [])

  return (
    <main id="main-content" className="v2-page">
      <a className="back-link" href="#/old"><Icon name="back" size={17} /> Old bookmarks</a>
      <header className="v2-hero">
        <p className="eyebrow">Bookmarks</p>
        <h1>A little less browsing.<br />A little more finding.</h1>
        <p>Your reviewed links, one at a time. Pick a space, then narrow it down.</p>
      </header>

      <nav className="v2-spaces" aria-label="Bookmark collections">
        {(['web', 'youtube'] as const).map((space) => (
          <a key={space} className={`v2-space v2-space--${space}`} href={space === 'web' ? '#/' : '#/youtube'}
            aria-current={collection === space ? 'page' : undefined}>
            <span className="v2-space__icon"><Icon name={space === 'web' ? 'bookmark' : 'play'} size={25} /></span>
            <span className="v2-space__copy"><strong>{space === 'web' ? 'Web' : 'YouTube'}</strong></span>
            <span className="v2-space__count">{collections[space].length}</span>
          </a>
        ))}
      </nav>

      <section className="v2-collection" aria-labelledby="v2-collection-title">
        <div className="v2-heading">
          <h2 id="v2-collection-title">{title} bookmarks</h2>
          <span role="status">{visible.length} of {entries.length}</span>
        </div>
        <div className="v2-search search-box">
          <Icon name="search" size={22} />
          <label className="sr-only" htmlFor="v2-search">Search {title} bookmarks</label>
          <input id="v2-search" type="search" value={queries[collection]}
            onChange={(event) => setQueries((current) => ({ ...current, [collection]: event.target.value }))}
            placeholder="Search titles, websites, or tags…" autoComplete="off" />
          {queries[collection] && <button type="button" className="clear-search" aria-label="Clear search"
            onClick={() => setQueries((current) => ({ ...current, [collection]: '' }))}><Icon name="close" size={19} /></button>}
          <kbd>/</kbd>
        </div>
        <div className="v2-filters" role="group" aria-label={`Filter ${title} by tags`}>
          <div className="v2-filter-heading"><span>Filter by tags</span>
            <span className="v2-filter-hint">{selected.length ? 'Matching all selected tags' : 'Choose any tags to focus your list'}</span>
          </div>
          <div className="v2-filter-options">
            <button type="button" className="v2-filter" aria-pressed={selected.length === 0}
              onClick={() => setFilters((current) => ({ ...current, [collection]: [] }))}>All</button>
            {tags.map((tag) => (
              <button type="button" key={tag} className="v2-filter" aria-pressed={selected.includes(tag)} onClick={() => toggleTag(tag)}>#{tag}</button>
            ))}
          </div>
        </div>

        <div className="v2-list-heading" aria-hidden="true"><span>Position</span><span>Bookmark & tags</span><span>Open</span></div>
        <ol className="v2-list" aria-label={`${title} bookmarks`}>
          {visible.map(({ bookmark, position, tags: bookmarkTags }) => (
            <li key={bookmark.id}>
              <a className="v2-row" href={bookmark.url} target="_blank" rel="noopener noreferrer"
                aria-label={`${bookmark.title} — opens in a new tab`}>
                <span className="v2-position" aria-label={`Position ${position}`}>{String(position).padStart(2, '0')}</span>
                <span className="v2-row__body"><strong>{bookmark.title}</strong>
                  <span className="v2-row__tags">{bookmarkTags.map((tag) => <span key={tag}>#{tag}</span>)}</span>
                </span>
                <Icon name="external" size={17} />
              </a>
            </li>
          ))}
        </ol>
        {!visible.length && <div className="v2-empty">
          <h3>{entries.length ? query ? 'No bookmarks match your search and tags.' : 'No bookmarks match these tags.' : 'No bookmarks here yet.'}</h3>
          <p>{entries.length ? query ? 'Clear your search or change the selected tags.' : 'Select All or deselect a tag to widen your list.' : `Promote a bookmark to the ${title} collection to see it here.`}</p>
        </div>}
        <p className="v2-order-note">Saved order · {title} collection</p>
      </section>
    </main>
  )
}
