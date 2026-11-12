import { useEffect, useMemo, useState } from 'react'
import { normalizeSearch } from '../data'
import { useFavorites } from '../favorites'
import { Icon } from '../icons'
import { BucketBoard } from '../components/BucketBoard'
import { useListening, useWatching } from '../listening'
import type { BookmarkData } from '../types'
import { v2Bookmarks, type V2Bookmark, type V2Collection } from '../v2'

type View = V2Collection | 'starred'
type StarredScope = 'all' | V2Collection | 'youtube-listen' | 'youtube-watch'

const starredScopes: { id: StarredScope; title: string; label?: string }[] = [
  { id: 'all', title: 'All' },
  { id: 'web', title: 'Web' },
  { id: 'youtube', title: 'YouTube' },
  { id: 'youtube-listen', title: 'YouTube Listen', label: 'Listen' },
  { id: 'youtube-watch', title: 'YouTube Watch', label: 'Watch' },
]

function matchesStarredScope({ bookmark, tags }: V2Bookmark, scope: StarredScope, watching: Readonly<Record<string, boolean>>) {
  if (scope === 'all') return true
  if (scope === 'web') return bookmark.placement?.collection === 'web'
  return bookmark.placement?.collection === 'youtube'
    && (scope === 'youtube' || (scope === 'youtube-listen'
      ? tags.includes('listening')
      : watching[bookmark.id] ?? !tags.includes('listening')))
}

const spaces: { id: View; title: string; icon: string; href: string }[] = [
  { id: 'web', title: 'Web', icon: 'bookmark', href: '#/' },
  { id: 'youtube', title: 'YouTube', icon: 'play', href: '#/youtube' },
  { id: 'starred', title: 'Starred', icon: 'star', href: '#/starred' },
]

export function V2Page({ data, collection }: { data: BookmarkData; collection: View }) {
  const favorites = useFavorites()
  const listening = useListening()
  const watching = useWatching()
  const collections = useMemo(() => ({ web: v2Bookmarks(data, 'web'), youtube: v2Bookmarks(data, 'youtube', listening.overrides) }), [data, listening.overrides])
  const [filters, setFilters] = useState<Record<View, string[]>>({ web: [], youtube: [], starred: [] })
  const [queries, setQueries] = useState<Record<View, string>>({ web: '', youtube: '', starred: '' })
  const [starredScope, setStarredScope] = useState<StarredScope>('all')
  const [excludedTags, setExcludedTags] = useState<Record<View, string[]>>({ web: [], youtube: [], starred: [] })
  const [tagModes, setTagModes] = useState<Record<View, 'include' | 'exclude'>>({ web: 'include', youtube: 'include', starred: 'include' })
  const [tagQuery, setTagQuery] = useState('')
  const [showAllTags, setShowAllTags] = useState(false)
  const [blockedTabs, setBlockedTabs] = useState<{ view: string; ids: string[] } | null>(null)
  useEffect(() => { setTagQuery(''); setShowAllTags(false) }, [collection])
  const entriesById = new Map([...collections.web, ...collections.youtube].map((entry) => [entry.bookmark.id, entry]))
  const starred = favorites.ids.flatMap((id) => {
    const entry = entriesById.get(id)
    return entry ? [entry] : []
  })
  const scopes = starredScopes.map((scope) => ({
    ...scope,
    entries: starred.filter((entry) => matchesStarredScope(entry, scope.id, watching.overrides)),
  }))
  const activeScope = scopes.find((scope) => scope.id === starredScope)!
  const scopeTitle = activeScope.title
  const entries = collection === 'starred'
    ? activeScope.entries
    : collections[collection]
  const tagCounts = new Map<string, number>()
  for (const entry of entries) for (const tag of entry.tags) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1)
  const tags = [...tagCounts.keys()].sort((a, b) => (tagCounts.get(b)! - tagCounts.get(a)!) || a.localeCompare(b))
  const selected = filters[collection]
  const supportsExclusion = collection === 'starred' || collection === 'youtube'
  const tagMode = tagModes[collection]
  const excluded = excludedTags[collection]
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
    if (supportsExclusion && tagMode === 'exclude') {
      setExcludedTags((current) => ({
        ...current,
        [collection]: current[collection].includes(tag) ? current[collection].filter((item) => item !== tag) : [...current[collection], tag],
      }))
      setFilters((current) => ({ ...current, [collection]: current[collection].filter((item) => item !== tag) }))
    } else {
      setFilters((current) => ({
        ...current,
        [collection]: current[collection].includes(tag)
          ? current[collection].filter((item) => item !== tag) : [...current[collection], tag],
      }))
      setExcludedTags((current) => ({ ...current, [collection]: current[collection].filter((item) => item !== tag) }))
    }
  }

  const scopeButton = (scope: typeof scopes[number]) => (
    <button key={scope.id} type="button" aria-label={scope.title} aria-pressed={starredScope === scope.id}
      title={scope.id === 'youtube-listen' ? 'YouTube bookmarks tagged listening' : scope.id === 'youtube-watch' ? 'YouTube bookmarks selected for Watch' : undefined}
      onClick={() => {
        setStarredScope(scope.id)
        setFilters((current) => ({ ...current, starred: [] }))
        setExcludedTags((current) => ({ ...current, starred: [] }))
        setTagQuery('')
        setShowAllTags(false)
      }}>
      {scope.label ?? scope.title}<span aria-hidden="true">{scope.entries.length}</span>
    </button>
  )

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
    <main id="main-content" className={`v2-page${collection === 'starred' ? ' v2-page--starred' : ''}`}>
      <header className="v2-hero">
        <p className="eyebrow">{collection === 'starred' ? '✧ The enchanted archive' : 'Bookmarks'}</p>
        <h1>{collection === 'starred' ? <>A home for your<br /><em>favorite discoveries.</em></> : <>A little less browsing.<br />A little more finding.</>}</h1>
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
      {listening.storageError && <p role="status">Your browser couldn’t save your listening choices. They’ll last until you reload this page.</p>}
      {watching.storageError && <p role="status">Your browser couldn’t save your Watch choices. They’ll last until you reload this page.</p>}
      {collection === 'starred' && <p className="v2-personal-note">Your current favorites, saved in this browser. Star or unstar a bookmark anytime; its saved position stays the same.</p>}
      <section className="v2-collection" aria-labelledby="v2-collection-title">
        <div className="v2-heading">
          <h2 id="v2-collection-title">{title} bookmarks</h2>
          <div className="v2-heading-actions">
            {Object.keys(listening.overrides).length > 0 && (
              <button type="button" className="v2-lucky" onClick={listening.reset}
                title="Restore the saved listening tags for every channel in this browser">
                Reset listening choices
              </button>
            )}
            {Object.keys(watching.overrides).length > 0 && (
              <button type="button" className="v2-lucky" onClick={watching.reset}
                title="Restore Watch defaults based on listening choices">Reset Watch choices</button>
            )}
            {collection === 'starred' && (
              <>
                <button type="button" className="v2-lucky" onClick={favorites.clear} disabled={!favorites.ids.length}
                  title="Remove all stars across every collection, including bookmarks hidden by filters">
                  Remove all stars
                </button>
                <button type="button" className="v2-lucky" onClick={openAll} disabled={!visible.length}
                  title={`Open ${remaining ? 'remaining' : 'all'} ${remaining?.length ?? visible.length} bookmarks in the current view in new tabs`}>
                  {remaining ? 'Open remaining' : 'Open all'} ({remaining?.length ?? visible.length}) <Icon name="external" size={16} />
                </button>
              </>
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
            {scopes.filter((scope) => scope.id === 'all' || scope.id === 'web').map(scopeButton)}
            <div className="v2-starred-youtube" role="group" aria-label="YouTube filters">
              {scopes.filter((scope) => scope.id.startsWith('youtube')).map(scopeButton)}
            </div>
          </div>
        )}
        {collection === 'starred' && (starredScope === 'youtube-listen' || starredScope === 'youtube-watch') && <BucketBoard key={starredScope} scope={starredScope} entries={collections.youtube} />}
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
          {supportsExclusion && (
            <div className="v2-tag-modes" role="group" aria-label="Tag filter mode">
              <button type="button" className="v2-filter" aria-pressed={tagMode === 'include'} onClick={() => setTagModes((current) => ({ ...current, [collection]: 'include' }))}>Include tags</button>
              <button type="button" className="v2-filter" aria-pressed={tagMode === 'exclude'} onClick={() => setTagModes((current) => ({ ...current, [collection]: 'exclude' }))}>Exclude tags</button>
            </div>
          )}
          <label className="v2-tag-search">Find a tag
            <input type="text" value={tagQuery} onChange={(event) => setTagQuery(event.target.value)}
              placeholder={`Search ${tags.length} tags…`} />
          </label>
          <p className="v2-tag-hint">{tagQuery ? `${matchingTags.length} matching tags` : showAllTags ? `All ${tags.length} tags` : `Most-used tags · ${tags.length} total`} · {supportsExclusion && tagMode === 'exclude' ? 'Select tags to hide bookmarks with any of them.' : 'Select tags to match all.'}</p>
          <div className="v2-filter-options">
            <button type="button" className="v2-filter" aria-pressed={selected.length === 0 && excluded.length === 0}
              onClick={() => {
                setFilters((current) => ({ ...current, [collection]: [] }))
                setExcludedTags((current) => ({ ...current, [collection]: [] }))
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

        {collection !== 'web' && <p className="v2-personal-note">Choose watching, listening, or both for each channel. These controls decide where starred channels appear in Watch and Listen. Your choices are saved in this browser.</p>}
        <div className="v2-list-heading" aria-hidden="true"><span>Position</span><span>Bookmark & tags</span><span>Star</span></div>
        <ol className="v2-list" aria-label={`${title} bookmarks`}>
          {visible.map(({ bookmark, position, tags: bookmarkTags }) => (
            <li key={bookmark.id} className="v2-item">
              <div className="v2-row">
                <span className="v2-position" aria-label={`Position ${position}`}>{String(position).padStart(2, '0')}</span>
                <span className="v2-row__body">
                  <a className="v2-row__link" href={bookmark.url} target="_blank" rel="noopener noreferrer"
                    aria-label={`${bookmark.title} — opens in a new tab`}><strong>{bookmark.title}</strong></a>
                  <span className="v2-row__tags">
                    {bookmarkTags.filter((tag) => tag !== 'listening' || bookmark.placement?.collection !== 'youtube')
                      .map((tag) => <span key={tag}>#{tag}</span>)}
                    {bookmark.placement?.collection === 'youtube' && (
                      <>
                        <button type="button" className="v2-listening"
                          aria-pressed={watching.overrides[bookmark.id] ?? !bookmarkTags.includes('listening')}
                          aria-label={`Watching for ${bookmark.title}`}
                          title="Show or hide this channel in starred Watch"
                          onClick={() => watching.toggle(bookmark.id, watching.overrides[bookmark.id] ?? !bookmarkTags.includes('listening'))}>
                          {(watching.overrides[bookmark.id] ?? !bookmarkTags.includes('listening'))
                            ? <>#watching <Icon name="close" size={11} /></> : '+ watching'}
                        </button>
                        <button type="button" className="v2-listening" aria-pressed={bookmarkTags.includes('listening')}
                          aria-label={`Listening for ${bookmark.title}`}
                          title="Show or hide this channel in starred Listen"
                          onClick={() => {
                            // Preserve Watch membership when changing Listen for the first time.
                            if (watching.overrides[bookmark.id] === undefined) watching.set(bookmark.id, !bookmarkTags.includes('listening'))
                            listening.toggle(bookmark.id, bookmarkTags.includes('listening'))
                          }}>
                          {bookmarkTags.includes('listening') ? <>#listening <Icon name="close" size={11} /></> : '+ listening'}
                        </button>
                      </>
                    )}
                  </span>
                </span>
                <Icon name="external" size={17} />
              </div>
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
