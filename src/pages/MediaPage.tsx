import { useEffect, useMemo, useState } from 'react'
import { sortMedia, validateMediaData, type MediaData, type MediaEntry, type MediaSort } from '../media'

type Section = 'book' | 'screen'
type ScreenType = 'all' | 'movie' | 'tv'
const sections: { kind: Section; label: string; route: string; mark: string }[] = [
  { kind: 'book', label: 'Books', route: '#/library', mark: 'B' },
  { kind: 'screen', label: 'Screen', route: '#/library/screen', mark: 'S' },
]

type Facet = 'genre' | 'series' | 'universe' | 'creator' | 'year' | 'language'
type Filters = Partial<Record<Facet, string>>
const sectionCopy: Record<Section, { heading: string; intro: string; creator: string; date: string }> = {
  book: { heading: 'The reading shelf.', intro: 'Books, authors, and the stories that continue across volumes.', creator: 'Author', date: 'Published' },
  screen: { heading: 'The screen shelf.', intro: 'Films and shows together, with room for series, universes, and seasons.', creator: 'Director / creator', date: 'Released / first aired' },
}
const orderLabels: Record<MediaSort, [string, string]> = {
  recent: ['Newest first', 'Oldest first'],
  published: ['Newest first', 'Oldest first'],
  title: ['A to Z', 'Z to A'],
  creator: ['A to Z', 'Z to A'],
  series: ['First to last', 'Last to first'],
}

const formatDate = (value: string) => value.length === 4 ? value : new Intl.DateTimeFormat('en', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`))

function ranked(values: string[]): string[] {
  const counts = new Map<string, number>()
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1))
  return [...counts.keys()].sort((a, b) => counts.get(b)! - counts.get(a)! || a.localeCompare(b))
}

export function MediaPage({ section, initialScreenType }: { section: Section; initialScreenType?: 'movie' | 'tv' }) {
  const [data, setData] = useState<MediaData | null>(null)
  const [error, setError] = useState('')
  const [filtersBySection, setFiltersBySection] = useState<Record<Section, Filters>>({ book: {}, screen: {} })
  const [sortBySection, setSortBySection] = useState<Record<Section, MediaSort>>({ book: 'recent', screen: 'recent' })
  const [reversedBySection, setReversedBySection] = useState<Record<Section, boolean>>({ book: false, screen: false })
  const [queryBySection, setQueryBySection] = useState<Record<Section, string>>({ book: '', screen: '' })
  const [screenType, setScreenType] = useState<ScreenType>(initialScreenType ?? 'all')
  const [moreFilters, setMoreFilters] = useState(false)

  useEffect(() => { setScreenType(initialScreenType ?? 'all') }, [initialScreenType])

  useEffect(() => {
    const controller = new AbortController()
    fetch(`${import.meta.env.BASE_URL}data/media.json`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Could not load library data (${response.status})`)
        return response.json() as Promise<unknown>
      })
      .then((value) => setData(validateMediaData(value)))
      .catch((reason: unknown) => {
        if ((reason as Error).name !== 'AbortError') setError(reason instanceof Error ? reason.message : 'Could not load library data')
      })
    return () => controller.abort()
  }, [])

  const entries = useMemo(() => data?.entries.filter((entry) => section === 'book' ? entry.kind === 'book' : entry.kind !== 'book') ?? [], [data, section])
  const filters = filtersBySection[section]
  const facets = useMemo(() => ({
    genre: ranked(entries.flatMap((entry) => entry.genres)),
    series: ranked(entries.flatMap((entry) => entry.series ? [entry.series.name] : [])),
    universe: ranked(entries.flatMap((entry) => entry.universe ? [entry.universe] : [])),
    creator: ranked(entries.flatMap((entry) => entry.creators)),
    year: ranked(entries.map((entry) => entry.published.slice(0, 4))),
    language: ranked(entries.flatMap((entry) => entry.language ? [entry.language] : [])),
  }), [entries])
  const query = queryBySection[section].trim().toLocaleLowerCase()
  const visible = sortMedia(entries.filter((entry) => {
    if (section === 'screen' && screenType !== 'all' && entry.kind !== screenType) return false
    if (filters.genre && !entry.genres.includes(filters.genre)) return false
    if (filters.series && entry.series?.name !== filters.series) return false
    if (filters.universe && entry.universe !== filters.universe) return false
    if (filters.creator && !entry.creators.includes(filters.creator)) return false
    if (filters.year && entry.published.slice(0, 4) !== filters.year) return false
    if (filters.language && entry.language !== filters.language) return false
    return !query || [entry.title, ...entry.creators, ...entry.genres, entry.series?.name ?? '', entry.universe ?? '', entry.language ?? ''].some((part) => part.toLocaleLowerCase().includes(query))
  }), sortBySection[section], reversedBySection[section])

  const setFacet = (facet: Facet, value?: string) => setFiltersBySection((current) => ({
    ...current, [section]: { ...current[section], [facet]: current[section][facet] === value ? undefined : value },
  }))
  const clear = () => {
    setFiltersBySection((current) => ({ ...current, [section]: {} }))
    setQueryBySection((current) => ({ ...current, [section]: '' }))
    if (section === 'screen') setScreenType('all')
  }
  const activeCount = Object.values(filters).filter(Boolean).length + (query ? 1 : 0) + (section === 'screen' && screenType !== 'all' ? 1 : 0)
  const copy = sectionCopy[section]
  const orderLabel = orderLabels[sortBySection[section]][reversedBySection[section] ? 1 : 0]

  return <main id="main-content" className="media-page">
    <header className="media-hero">
      <div>
        <p className="media-eyebrow">A personal library <span> / </span> Books & screen</p>
        <h1>{copy.heading}</h1>
        <p>{copy.intro}</p>
      </div>
      <span className="media-hero-mark" aria-hidden="true">{section === 'book' ? '✳' : '◉'}</span>
    </header>

    <nav className="media-tabs" aria-label="Library sections">
      {sections.map((tab) => <a key={tab.kind} href={tab.route} aria-current={section === tab.kind ? 'page' : undefined}>
        <span className="media-tab-mark" aria-hidden="true">{tab.mark}</span><span>{tab.label}</span>
      </a>)}
    </nav>

    {error && <div className="media-error" role="alert"><strong>Library couldn’t open.</strong><p>{error}</p><button onClick={() => window.location.reload()}>Try again</button></div>}
    {!data && !error && <p className="media-loading" role="status">Opening your library…</p>}
    {data && <>
      <div className="media-toolbar">
        <div><p className="media-eyebrow">Your collection</p><h2>{sections.find((tab) => tab.kind === section)?.label}</h2></div>
        {entries.length > 0 && <div className="media-sort-controls">
          <label className="media-sort">Sort by
            <select value={sortBySection[section]} onChange={(event) => {
              setSortBySection((current) => ({ ...current, [section]: event.target.value as MediaSort }))
              setReversedBySection((current) => ({ ...current, [section]: false }))
            }}>
              <option value="recent">{section === 'book' ? 'Recently read' : 'Recently watched'}</option><option value="title">Title</option><option value="published">Publication / release</option>
              <option value="creator">{copy.creator}</option><option value="series">Series order</option>
            </select>
          </label>
          <button className="media-direction" type="button" aria-label={`Sort order: ${orderLabel}. Reverse order`}
            onClick={() => setReversedBySection((current) => ({ ...current, [section]: !current[section] }))}>
            <span aria-hidden="true">⇅</span>{orderLabel}
          </button>
        </div>}
      </div>
      {entries.length > 0 && <><div className="media-search-row">
        <label className="media-search"><span className="sr-only">Search {section === 'book' ? 'books' : 'screen'}</span><span aria-hidden="true">⌕</span>
          <input type="search" placeholder={section === 'book' ? 'Search books, people, series…' : 'Search films, shows, people, universes…'} value={queryBySection[section]}
            onChange={(event) => setQueryBySection((current) => ({ ...current, [section]: event.target.value }))} /></label>
      </div>
      <div className="media-filters">
        {section === 'screen' && <div className="media-filter-line"><strong>Type</strong><div className="media-chips">
          {([['all', 'All'], ['movie', 'Movies'], ['tv', 'TV series']] as const).map(([value, label]) =>
            <button key={value} type="button" aria-pressed={screenType === value} onClick={() => setScreenType(value)}>{label}</button>)}
        </div></div>}
        <div className="media-filter-line"><strong>Genre</strong><div className="media-chips">
          <button type="button" aria-pressed={!filters.genre} onClick={() => setFacet('genre', undefined)}>All</button>
          {facets.genre.map((genre) => <button key={genre} type="button" aria-pressed={filters.genre === genre} onClick={() => setFacet('genre', genre)}>{genre}</button>)}
        </div></div>
        {facets.series.length > 0 && <div className="media-filter-line"><strong>Series</strong><div className="media-chips">
          <button type="button" aria-pressed={!filters.series} onClick={() => setFacet('series', undefined)}>All</button>
          {facets.series.map((series) => <button key={series} type="button" aria-pressed={filters.series === series} onClick={() => setFacet('series', series)}>{series}</button>)}
        </div></div>}
        {section === 'screen' && facets.universe.length > 0 && <div className="media-filter-line"><strong>Universe</strong><div className="media-chips">
          <button type="button" aria-pressed={!filters.universe} onClick={() => setFacet('universe', undefined)}>All</button>
          {facets.universe.map((universe) => <button key={universe} type="button" aria-pressed={filters.universe === universe} onClick={() => setFacet('universe', universe)}>{universe}</button>)}
        </div></div>}
        <button type="button" className="media-more" aria-expanded={moreFilters} onClick={() => setMoreFilters((value) => !value)}>
          {moreFilters ? 'Hide filters' : 'More filters'} <span aria-hidden="true">{moreFilters ? '−' : '+'}</span>
        </button>
        {moreFilters && <div className="media-extra-filters">
          {(['creator', 'year', 'language'] as const).map((facet) => facets[facet].length > (facet === 'language' ? 1 : 0) && <label key={facet}>{facet === 'creator' ? copy.creator : facet === 'year' ? copy.date : 'Language'}
            <select value={filters[facet] ?? ''} onChange={(event) => setFacet(facet, event.target.value || undefined)}>
              <option value="">All</option>{facets[facet].map((value) => <option key={value} value={value}>{value}</option>)}
            </select></label>)}
        </div>}
        {activeCount > 0 && <button type="button" className="media-clear" onClick={clear}>Clear filters <span>×</span></button>}
      </div></>}

      {visible.length > 0 ? <ol className="media-list" aria-label={`${sections.find((tab) => tab.kind === section)?.label} list`}>
        {visible.map((entry) => <MediaRow key={entry.id} entry={entry}
          onSeries={() => setFacet('series', entry.series?.name)} onUniverse={() => setFacet('universe', entry.universe)} />)}
      </ol> : <div className="media-empty"><span aria-hidden="true">⌁</span><h3>{entries.length ? 'Nothing on this shelf matches.' : 'This shelf is ready.'}</h3>
        <p>{entries.length ? 'Try another filter or clear your search.' : section === 'book' ? 'Your books will appear here when you add them.' : 'Your films and shows will appear here when you add them.'}</p>
        {activeCount > 0 && <button type="button" onClick={clear}>Clear filters</button>}</div>}
      {entries.length > 0 && <p className="media-footnote">{section === 'book' ? 'Books without a read date' : 'Screen entries without a watch date'} appear after dated entries.</p>}
    </>}
  </main>
}

function MediaRow({ entry, onSeries, onUniverse }: { entry: MediaEntry; onSeries: () => void; onUniverse: () => void }) {
  const creatorLabel = entry.kind === 'book' ? 'Author' : entry.kind === 'movie' ? 'Director' : 'Creator'
  const dateLabel = entry.kind === 'book' ? 'Published' : entry.kind === 'movie' ? 'Released' : 'First aired'
  const finishedDates = [...(entry.completedDates ?? []), ...(entry.seasons ?? []).flatMap((season) => season.completedDates ?? [])]
    .sort((a, b) => b.localeCompare(a))
  const lastFinished = finishedDates[0]
  const seasons = [...(entry.seasons ?? [])].sort((a, b) => a.number - b.number)
  return <li className="media-item">
    <div className={`media-cover media-cover--${entry.kind}`} aria-hidden="true"><span>{entry.kind === 'book' ? 'BOOK' : entry.kind === 'movie' ? 'FILM' : 'SERIES'}</span><strong>{entry.title.split(/\s+/).slice(0, 3).map((word) => word[0]).join('')}</strong><i /></div>
    <div className="media-item-body">
      <div className="media-item-top"><div><span className="media-item-kicker">{entry.kind === 'book' ? 'BOOK' : entry.kind === 'movie' ? 'FILM' : 'TV SERIES'} <span>·</span> {entry.published.slice(0, 4)}</span>
        <h3>{entry.title}</h3>{entry.creators.length > 0 && <p>{creatorLabel}: {entry.creators.join(', ')}</p>}</div>
        {entry.url && <a href={entry.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${entry.title} source in a new tab`} className="media-external">↗</a>}
      </div>
      <div className="media-item-tags">{entry.series && <button type="button" onClick={onSeries}>↗ {entry.series.name}{entry.series.position ? ` · ${entry.series.position}` : ''}</button>}
        {entry.universe && <button type="button" onClick={onUniverse}>⌁ {entry.universe}</button>}
        {entry.genres.map((genre) => <span key={genre}>{genre}</span>)}
      </div>
      <div className="media-item-bottom"><span>{dateLabel} {formatDate(entry.published)}</span><span>{lastFinished ? `${entry.kind === 'book' ? 'Last read' : 'Last watched'} ${formatDate(lastFinished)}` : seasons.length ? 'Watched seasons recorded' : `${entry.kind === 'book' ? 'Read' : 'Watch'} date not set`}</span></div>
      {entry.completedDates && entry.completedDates.length > 1 && <details className="media-history"><summary>{entry.kind === 'book' ? 'Reading' : 'Watching'} dates</summary>
        <span>{[...entry.completedDates].sort((a, b) => b.localeCompare(a)).map(formatDate).join(' · ')}</span>
      </details>}
      {seasons.length > 0 && <details className="media-seasons"><summary>Seasons {seasons[0].number}–{seasons[seasons.length - 1].number}</summary>
        <ul>{seasons.map((season) => <li key={season.number}><strong>Season {season.number}</strong><span>{season.completedDates?.length
          ? [...season.completedDates].sort((a, b) => b.localeCompare(a)).map(formatDate).join(' · ')
          : 'Watch dates not set'}</span></li>)}</ul>
      </details>}
    </div>
  </li>
}
