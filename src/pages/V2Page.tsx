import { useEffect, useMemo, useState } from 'react'
import { normalizeSearch } from '../data'
import { useFavorites } from '../favorites'
import { Icon } from '../icons'
import type { BookmarkData } from '../types'
import { v2Bookmarks, type V2Collection } from '../v2'

type View = V2Collection | 'starred'
type StarredScope = 'all' | V2Collection

const starredScopes: { id: StarredScope; title: string }[] = [
  { id: 'all', title: 'All' },
  { id: 'web', title: 'Web' },
  { id: 'youtube', title: 'YouTube' },
]

const spaces: { id: View; title: string; icon: string; href: string }[] = [
  { id: 'web', title: 'Web', icon: 'bookmark', href: '#/' },
  { id: 'youtube', title: 'YouTube', icon: 'play', href: '#/youtube' },
  { id: 'starred', title: 'Starred', icon: 'star', href: '#/starred' },
]

export function V2Page({ data, collection }: { data: BookmarkData; collection: View }) {
  const favorites = useFavorites()
  const collections = useMemo(() => ({ web: v2Bookmarks(data, 'web'), youtube: v2Bookmarks(data, 'youtube') }), [data])
  const [filters, setFilters] = useState<Record<View, string[]>>({ web: [], youtube: [], starred: [] })
  const [queries, setQueries] = useState<Record<View, string>>({ web: '', youtube: '', starred: '' })
  const [starredScope, setStarredScope] = useState<StarredScope>('all')
  const [excludedTags, setExcludedTags] = useState<string[]>([])
  const [tagMode, setTagMode] = useState<'include' | 'exclude'>('include')
  const [tagQuery, setTagQuery] = useState('')
  const [showAllTags, setShowAllTags] = useState(false)
  const [blockedTabs, setBlockedTabs] = useState<{ view: string; ids: string[] } | null>(null)
  useEffect(() => { setTagQuery(''); setShowAllTags(false) }, [collection])
  const entriesById = new Map([...collections.web, ...collections.youtube].map((entry) => [entry.bookmark.id, entry]))
  const starred = favorites.ids.flatMap((id) => {
    const entry = entriesById.get(id)
    return entry ? [entry] : []
  })
  const starredCounts = {
    all: starred.length,
    web: starred.filter(({ bookmark }) => bookmark.placement?.collection === 'web').length,
    youtube: starred.filter(({ bookmark }) => bookmark.placement?.collection === 'youtube').length,
  }
  const scopeTitle = starredScopes.find((scope) => scope.id === starredScope)!.title
  const entries = collection === 'starred'
    ? starred.filter(({ bookmark }) => starredScope === 'all' || bookmark.placement?.collection === starredScope)
    : collections[collection]
  const tagCounts = new Map<string, number>()
  for (const entry of entries) for (const tag of entry.tags) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1)
  const tags = [...tagCounts.keys()].sort((a, b) => (tagCounts.get(b)! - tagCounts.get(a)!) || a.localeCompare(b))
  const selected = filters[collection]
  const excluded = collection === 'starred' ? excludedTags : []
  const matchingTags = tags.filter((tag) => normalizeSearch(tag).includes(normalizeSearch(tagQuery).replace(/^#/, '')))
  const displayedTags = [...new Set([...selected, ...excluded, ...(tagQuery || showAllTags ? matchingTags : matchingTags.slice(0, 12))])]
  const query = normalizeSearch(queries[collection]).replace(/^#/, '')
  const visible = entries.filter(({ bookmark, tags: bookmarkTags }) =>
    selected.every((tag) => bookmarkTags.includes(tag))
    && !excluded.some((tag) => bookmarkTags.includes(tag))
    && (!query || normalizeSearch([bookmark.title, bookmark.description ?? '', bookmark.url, ...bookmarkTags].join(' ')).includes(query)))
  const title = spaces.find((space) => space.id === collection)!.title
  const viewKey = JSON.stringify([collection, starredScope, selected, excluded, query, visible.map(({ bookmark }) => [bookmark.id, bookmark.url])])
  useEffect(() => { setBlockedTabs(null) }, [viewKey])
  const remaining = blockedTabs?.view === viewKey ? blockedTabs.ids : null
  const openAll = () => {
    const blocked: string[] = []
    for (const { bookmark } of visible) {
      if (remaining && !remaining.includes(bookmark.id)) continue
      // Opening a blank tab first lets us detect blocking: noopener/noreferrer
      // return null even when a tab opened successfully.
      const tab = window.open('about:blank', '_blank')
      if (!tab) {
        blocked.push(bookmark.id)
        continue
      }
      tab.opener = null
      const link = tab.document.createElement('a')
      link.href = bookmark.url
      link.rel = 'noopener noreferrer'
      link.referrerPolicy = 'no-referrer'
      tab.document.body.append(link)
      link.click()
    }
    setBlockedTabs(blocked.length ? { view: viewKey, ids: blocked } : null)
  }
  const getLucky = () => {
    if (!visible.length) return
    const { bookmark } = visible[Math.floor(Math.random() * visible.length)]
    window.open(bookmark.url, '_blank', 'noopener,noreferrer')
  }
  const toggleTag = (tag: string) => {
    if (collection === 'starred' && tagMode === 'exclude') {
      setExcludedTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag])
      setFilters((current) => ({ ...current, starred: current.starred.filter((item) => item !== tag) }))
    } else {
      setFilters((current) => ({
        ...current,
        [collection]: current[collection].includes(tag)
          ? current[collection].filter((item) => item !== tag) : [...current[collection], tag],
      }))
      if (collection === 'starred') setExcludedTags((current) => current.filter((item) => item !== tag))
    }
  }

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
      <header className="v2-hero">
        <p className="eyebrow">Bookmarks</p>
        <h1>A little less browsing.<br />A little more finding.</h1>
        <p>Your links, one at a time. Pick a space, then narrow it down.</p>
      </header>

      <nav className="v2-spaces" aria-label="Bookmark collections">
        {spaces.map((space) => (
          <a key={space.id} className={`v2-space v2-space--${space.id}`} href={space.href}
            aria-current={collection === space.id ? 'page' : undefined}>
            <span className="v2-space__icon"><Icon name={space.icon} size={25} /></span>
            <span className="v2-space__copy"><strong>{space.title}</strong></span>
          </a>
        ))}
      </nav>

      {favorites.storageError && <p role="status">Your browser couldn’t save these stars. They’ll last until you reload this page.</p>}
      {collection === 'starred' && <p className="v2-personal-note">Your current favorites, saved in this browser. Star or unstar a bookmark anytime; its saved position stays the same.</p>}
      <section className="v2-collection" aria-labelledby="v2-collection-title">
        <div className="v2-heading">
          <h2 id="v2-collection-title">{title} bookmarks</h2>
          <div className="v2-heading-actions">
            {collection === 'starred' && (
              <button type="button" className="v2-lucky" onClick={openAll} disabled={!visible.length}
                title={`Open ${remaining ? 'remaining' : 'all'} ${remaining?.length ?? visible.length} bookmarks in the current view in new tabs`}>
                {remaining ? 'Open remaining' : 'Open all'} ({remaining?.length ?? visible.length}) <Icon name="external" size={16} />
              </button>
            )}
            <button type="button" className="v2-lucky" onClick={getLucky} disabled={!visible.length}
              title={`Open a random ${title} bookmark from the current results in a new tab`}>
              Get Lucky <Icon name="external" size={16} />
            </button>
          </div>
        </div>
        {collection === 'starred' && remaining && (
          <p role="status">Your browser blocked {remaining.length} {remaining.length === 1 ? 'tab' : 'tabs'}. Allow pop-ups for this site using your browser’s address bar or site settings, then click Open remaining. Already opened bookmarks will not open again.</p>
        )}
        {collection === 'starred' && (
          <div className="v2-starred-scopes" role="group" aria-label="Filter starred by collection">
            {starredScopes.map((scope) => (
              <button key={scope.id} type="button" aria-pressed={starredScope === scope.id}
                onClick={() => {
                  setStarredScope(scope.id)
                  setFilters((current) => ({ ...current, starred: [] }))
                  setExcludedTags([])
                  setTagQuery('')
                  setShowAllTags(false)
                }}>
                {scope.title}<span aria-hidden="true">{starredCounts[scope.id]}</span>
              </button>
            ))}
          </div>
        )}
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
        <details className="v2-filters">
          <summary className="v2-filter-heading"><span>Filter by tags</span>
            <span className="v2-filter-hint">{excluded.length ? `${selected.length} included · ${excluded.length} excluded` : selected.length ? `${selected.length} selected · Matching all selected tags` : 'Choose any tags to focus your list'}</span>
          </summary>
          {collection === 'starred' && (
            <div className="v2-tag-modes" role="group" aria-label="Tag filter mode">
              <button type="button" className="v2-filter" aria-pressed={tagMode === 'include'} onClick={() => setTagMode('include')}>Include tags</button>
              <button type="button" className="v2-filter" aria-pressed={tagMode === 'exclude'} onClick={() => setTagMode('exclude')}>Exclude tags</button>
            </div>
          )}
          <label className="v2-tag-search">Find a tag
            <input type="text" value={tagQuery} onChange={(event) => setTagQuery(event.target.value)}
              placeholder={`Search ${tags.length} tags…`} />
          </label>
          <p className="v2-tag-hint">{tagQuery ? `${matchingTags.length} matching tags` : showAllTags ? `All ${tags.length} tags` : `Most-used tags · ${tags.length} total`} · {collection === 'starred' && tagMode === 'exclude' ? 'Select tags to hide bookmarks with any of them.' : 'Select tags to match all.'}</p>
          <div className="v2-filter-options">
            <button type="button" className="v2-filter" aria-pressed={selected.length === 0 && excluded.length === 0}
              onClick={() => {
                setFilters((current) => ({ ...current, [collection]: [] }))
                if (collection === 'starred') setExcludedTags([])
              }}>All</button>
            {displayedTags.map((tag) => (
              <button type="button" key={tag} className={`v2-filter${excluded.includes(tag) ? ' v2-filter--excluded' : ''}`}
                aria-pressed={selected.includes(tag) || excluded.includes(tag)} onClick={() => toggleTag(tag)}>
                {excluded.includes(tag) ? 'Excluded: ' : ''}#{tag}<span className="v2-tag-count" aria-hidden="true">{tagCounts.get(tag) ?? 0}</span>
              </button>
            ))}
          </div>
          {tagQuery && !matchingTags.length && <p className="v2-tag-hint" role="status">No tags found. Try another word.</p>}
          {tags.length > 12 && !tagQuery && <button className="v2-tags-toggle" type="button" aria-expanded={showAllTags}
            onClick={() => setShowAllTags((current) => !current)}>{showAllTags ? 'Show fewer tags' : `Show all ${tags.length} tags`}</button>}
        </details>

        <div className="v2-list-heading" aria-hidden="true"><span>Position</span><span>Bookmark & tags</span><span>Star</span></div>
        <ol className="v2-list" aria-label={`${title} bookmarks`}>
          {visible.map(({ bookmark, position, tags: bookmarkTags }) => (
            <li key={bookmark.id} className="v2-item">
              <a className="v2-row" href={bookmark.url} target="_blank" rel="noopener noreferrer"
                aria-label={`${bookmark.title} — opens in a new tab`}>
                <span className="v2-position" aria-label={`Position ${position}`}>{String(position).padStart(2, '0')}</span>
                <span className="v2-row__body"><strong>{bookmark.title}</strong>
                  <span className="v2-row__tags">{bookmarkTags.map((tag) => <span key={tag}>#{tag}</span>)}</span>
                </span>
                <Icon name="external" size={17} />
              </a>
              <button type="button" className="v2-star" aria-pressed={favorites.ids.includes(bookmark.id)}
                aria-label={`${favorites.ids.includes(bookmark.id) ? 'Unstar' : 'Star'} ${bookmark.title}`}
                onClick={() => favorites.toggle(bookmark.id)}><Icon name="star" size={21} /></button>
            </li>
          ))}
        </ol>
        {!visible.length && <div className="v2-empty">
          <h3>{entries.length ? query ? 'No bookmarks match your search and tags.' : 'No bookmarks match these tags.' : collection === 'starred' ? starredScope === 'all' ? 'No starred bookmarks yet.' : `No starred ${scopeTitle} bookmarks yet.` : 'No bookmarks here yet.'}</h3>
          <p>{entries.length ? query ? 'Clear your search or change the selected tags.' : 'Select All or deselect a tag to widen your list.' : collection === 'starred' ? starredScope === 'all' ? 'Use the star beside a Web bookmark or YouTube channel to keep it here.' : `Star a bookmark in ${scopeTitle} to keep it here, or select All to see your other favorites.` : `Promote a bookmark to the ${title} collection to see it here.`}</p>
        </div>}
        <p className="v2-order-note">{collection === 'starred' ? 'First starred first · Stored only in this browser' : `Saved order · ${title} collection`}</p>
      </section>
    </main>
  )
}
