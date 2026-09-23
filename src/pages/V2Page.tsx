import { useMemo, useState } from 'react'
import { Icon } from '../icons'
import type { BookmarkData } from '../types'
import { v2Bookmarks, type V2Collection } from '../v2'

export function V2Page({ data, collection }: { data: BookmarkData; collection: V2Collection }) {
  const collections = useMemo(() => ({ web: v2Bookmarks(data, 'web'), youtube: v2Bookmarks(data, 'youtube') }), [data])
  const [filters, setFilters] = useState<Record<V2Collection, string[]>>({ web: [], youtube: [] })
  const entries = collections[collection]
  const tags = [...new Set(entries.flatMap((entry) => entry.tags))].sort((a, b) => a.localeCompare(b))
  const selected = filters[collection]
  const visible = entries.filter((entry) => selected.every((tag) => entry.tags.includes(tag)))
  const title = collection === 'web' ? 'Web' : 'YouTube'
  const toggleTag = (tag: string) => setFilters((current) => ({
    ...current,
    [collection]: current[collection].includes(tag)
      ? current[collection].filter((item) => item !== tag) : [...current[collection], tag],
  }))

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
            <span className="v2-space__copy"><strong>{space === 'web' ? 'Web' : 'YouTube'}</strong>
              <small>{space === 'web' ? 'Reviewed websites' : 'Reviewed channels'}</small></span>
            <span className="v2-space__count">{collections[space].length}</span>
          </a>
        ))}
      </nav>

      <section className="v2-collection" aria-labelledby="v2-collection-title">
        <div className="v2-heading">
          <h2 id="v2-collection-title">{title} bookmarks</h2>
          <span role="status">{visible.length} of {entries.length}</span>
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
          <h3>{entries.length ? 'No bookmarks match these tags.' : 'No bookmarks here yet.'}</h3>
          <p>{entries.length ? 'Select All or deselect a tag to widen your list.' : `Promote a bookmark to the ${title} collection to see it here.`}</p>
        </div>}
        <p className="v2-order-note">Saved order · {title} collection</p>
      </section>
    </main>
  )
}
