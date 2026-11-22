import { useEffect, useMemo, useState } from 'react'
import { normalizeSearch } from '../data'
import { Icon } from '../icons'
import { BucketBoard } from '../components/BucketBoard'
import { useListening } from '../listening'
import type { BookmarkData } from '../types'
import { v2Bookmarks, type V2Bookmark, type V2Collection } from '../v2'

export type V2Route = V2Collection | 'buckets' | 'buckets-web'

const spaces = [
  { id: 'web', title: 'Web', icon: 'bookmark', href: '#/' },
  { id: 'youtube', title: 'YouTube', icon: 'play', href: '#/youtube' },
  { id: 'buckets', title: 'Buckets', icon: 'buckets', href: '#/buckets' },
] as const

const bucketCollections = [
  { id: 'youtube', title: 'YouTube', href: '#/buckets' },
  { id: 'web', title: 'Web', href: '#/buckets/web' },
] as const

export function V2Page({ data, route }: { data: BookmarkData; route: V2Route }) {
  const isBucketPage = route === 'buckets' || route === 'buckets-web'
  const collection = route === 'web' || route === 'buckets-web' ? 'web' : 'youtube'
  const listening = useListening()
  const collections = useMemo(() => ({ web: v2Bookmarks(data, 'web'), youtube: v2Bookmarks(data, 'youtube', listening.overrides) }), [data, listening.overrides])
  return (
    <main id="main-content" className="v2-page">
      <header className="v2-hero">
        {isBucketPage ? <h1>Buckets</h1> : <>
          <p className="eyebrow">Bookmarks</p>
          <h1>A little less browsing.<br />A little more finding.</h1>
          <p>Your links, one at a time. Pick a space, then narrow it down.</p>
        </>}
      </header>

      <nav className="v2-spaces" aria-label="Bookmark collections">
        {spaces.map((space) => (
          <a key={space.id} className={`v2-space v2-space--${space.id}`} href={space.href}
            aria-current={(isBucketPage ? 'buckets' : collection) === space.id ? 'page' : undefined}>
            <span className="v2-space__icon"><Icon name={space.icon} size={25} /></span>
            <span className="v2-space__copy"><strong>{space.title}</strong></span>
          </a>
        ))}
      </nav>

      {isBucketPage && <>
        <nav className="bucket-collections" aria-label="Bucket collections">
          {bucketCollections.map(({ id, title, href }) => (
            <a key={id} href={href} aria-current={collection === id ? 'page' : undefined}>{title}</a>
          ))}
        </nav>
        <BucketBoard key={collection} collection={collection} entries={collections[collection]} />
      </>}
      <BookmarkCollection collection={collection} entries={collections[collection]} listening={listening} hidden={isBucketPage} />
    </main>
  )
}

function BookmarkCollection({ collection, entries, listening, hidden }: {
  collection: V2Collection
  entries: V2Bookmark[]
  listening: ReturnType<typeof useListening>
  hidden: boolean
}) {
  const [filters, setFilters] = useState<Record<V2Collection, string[]>>({ web: [], youtube: [] })
  const [queries, setQueries] = useState<Record<V2Collection, string>>({ web: '', youtube: '' })
  const [excludedTags, setExcludedTags] = useState<Record<V2Collection, string[]>>({ web: [], youtube: [] })
  const [tagModes, setTagModes] = useState<Record<V2Collection, 'include' | 'exclude'>>({ web: 'include', youtube: 'include' })
  const [tagQuery, setTagQuery] = useState('')
  const [showAllTags, setShowAllTags] = useState(false)

  useEffect(() => { setTagQuery(''); setShowAllTags(false) }, [collection, hidden])
  useEffect(() => {
    if (hidden) return
    const focusSearch = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement
      if (target.matches('input, textarea, select, [contenteditable="true"]')) return
      event.preventDefault()
      document.getElementById('v2-search')?.focus()
    }
    window.addEventListener('keydown', focusSearch)
    return () => window.removeEventListener('keydown', focusSearch)
  }, [hidden])

  if (hidden) return null

  const tagCounts = new Map<string, number>()
  for (const entry of entries) for (const tag of entry.tags) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1)
  const tags = [...tagCounts.keys()].sort((a, b) => (tagCounts.get(b)! - tagCounts.get(a)!) || a.localeCompare(b))
  const selected = filters[collection]
  const supportsExclusion = collection === 'youtube'
  const tagMode = tagModes[collection]
  const excluded = excludedTags[collection]
  const matchingTags = tags.filter((tag) => normalizeSearch(tag).includes(normalizeSearch(tagQuery).replace(/^#/, '')))
  const displayedTags = [...new Set([...selected, ...excluded, ...(tagQuery || showAllTags ? matchingTags : matchingTags.slice(0, 12))])]
  const query = normalizeSearch(queries[collection]).replace(/^#/, '')
  const visible = entries.filter(({ bookmark, tags: bookmarkTags }) =>
    selected.every((tag) => bookmarkTags.includes(tag))
    && !excluded.some((tag) => bookmarkTags.includes(tag))
    && (!query || normalizeSearch([bookmark.title, bookmark.description ?? '', bookmark.url, ...bookmarkTags].join(' ')).includes(query)))
  const title = collection === 'youtube' ? 'YouTube' : 'Web'
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

  return (
      <section className="v2-collection" aria-labelledby="v2-collection-title">
        {collection === 'youtube' && listening.storageError &&
          <p role="status">Your browser couldn’t save your listening choices. They’ll last until you reload this page.</p>}
        <div className="v2-heading">
          <h2 id="v2-collection-title">{title} bookmarks</h2>
          <div className="v2-heading-actions">
            {collection === 'youtube' && Object.keys(listening.overrides).length > 0 && (
              <button type="button" className="v2-lucky" onClick={listening.reset}
                title="Restore the saved listening tags for every channel in this browser">
                Reset listening choices
              </button>
            )}
            <button type="button" className="v2-lucky" onClick={getLucky} disabled={!visible.length}
              title={`Open a random ${title} bookmark from the current results in a new tab`}>
              Get Lucky <Icon name="external" size={16} />
            </button>
          </div>
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

        <div className="v2-list-heading" aria-hidden="true"><span>Position</span><span>Bookmark & tags</span></div>
        <ol className="v2-list" aria-label={`${title} bookmarks`}>
          {visible.map(({ bookmark, position, tags: bookmarkTags }) => (
            <li key={bookmark.id}>
              <div className="v2-row">
                <span className="v2-position" aria-label={`Position ${position}`}>{String(position).padStart(2, '0')}</span>
                <span className="v2-row__body">
                  <a className="v2-row__link" href={bookmark.url} target="_blank" rel="noopener noreferrer"
                    aria-label={`${bookmark.title} — opens in a new tab`}><strong>{bookmark.title}</strong></a>
                  <span className="v2-row__tags">
                    {bookmarkTags.filter((tag) => tag !== 'listening' || collection !== 'youtube')
                      .map((tag) => <span key={tag}>#{tag}</span>)}
                    {collection === 'youtube' && (
                        <button type="button" className="v2-listening" aria-pressed={bookmarkTags.includes('listening')}
                          aria-label={`Listening for ${bookmark.title}`}
                          title="Set the listening tag for this channel in this browser"
                          onClick={() => listening.toggle(bookmark.id, bookmarkTags.includes('listening'))}>
                          {bookmarkTags.includes('listening') ? <>#listening <Icon name="close" size={11} /></> : '+ listening'}
                        </button>
                    )}
                  </span>
                </span>
                <Icon name="external" size={17} />
              </div>
            </li>
          ))}
        </ol>
        {!visible.length && <div className="v2-empty">
          <h3>{entries.length ? query ? 'No bookmarks match your search and tags.' : 'No bookmarks match these tags.' : 'No bookmarks here yet.'}</h3>
          <p>{entries.length ? query ? 'Clear your search or change the selected tags.' : 'Select All or deselect a tag to widen your list.' : `Promote a bookmark to the ${title} collection to see it here.`}</p>
        </div>}
        <p className="v2-order-note">Saved order · {title} collection</p>
      </section>
  )
}
