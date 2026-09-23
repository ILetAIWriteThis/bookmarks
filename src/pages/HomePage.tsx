import { useEffect, useMemo, useState } from 'react'
import { BookmarkCard } from '../components/BookmarkCard'
import { CategoryCard } from '../components/CategoryCard'
import { EmptyState } from '../components/EmptyState'
import { dailyBookmarks, rootCategories, searchBookmarks } from '../data'
import { Icon } from '../icons'
import type { BookmarkData } from '../types'

interface HomePageProps { data: BookmarkData }
const searchStorageKey = 'bookmarks-search'

export function HomePage({ data }: HomePageProps) {
  const [query, setQuery] = useState(() => {
    try { return sessionStorage.getItem(searchStorageKey) ?? '' } catch { return '' }
  })
  const results = useMemo(() => searchBookmarks(data, query), [data, query])
  const daily = useMemo(() => dailyBookmarks(data.bookmarks), [data.bookmarks])
  const categories = useMemo(() => rootCategories(data.categories), [data.categories])

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement
      if (target.matches('input, textarea, select, [contenteditable="true"]')) return
      event.preventDefault()
      document.getElementById('global-search')?.focus()
    }
    window.addEventListener('keydown', focusSearch)
    return () => window.removeEventListener('keydown', focusSearch)
  }, [])

  const updateQuery = (value: string) => {
    setQuery(value)
    try { sessionStorage.setItem(searchStorageKey, value) } catch { /* Storage may be disabled. */ }
  }

  return (
    <main id="main-content" className="home-page">
      <a className="back-link" href="#/"><Icon name="back" size={17} /> Current bookmarks</a>
      <section className="hero" aria-labelledby="home-title">
        <p className="eyebrow">Old bookmarks · awaiting review</p>
        <h1 id="home-title">Where do you want<br className="desktop-break" /> to go?</h1>
        <div className="search-box">
          <Icon name="search" size={22} />
          <label className="sr-only" htmlFor="global-search">Search old bookmarks</label>
          <input
            id="global-search"
            type="search"
            value={query}
            onChange={(event) => updateQuery(event.target.value)}
            placeholder="Search bookmarks, tags, or categories…"
            autoComplete="off"
          />
          {query && (
            <button type="button" className="clear-search" onClick={() => updateQuery('')} aria-label="Clear search">
              <Icon name="close" size={19} />
            </button>
          )}
          <kbd>/</kbd>
        </div>
      </section>

      {query.trim() ? (
        <section className="content-section search-results" aria-labelledby="search-heading" aria-live="polite">
          <div className="section-heading">
            <div><p className="section-kicker">Across old bookmarks</p><h2 id="search-heading">Search results</h2></div>
            <span className="result-count">{results.length} found</span>
          </div>
          {results.length ? (
            <div className="bookmark-grid">{results.map((bookmark) => <BookmarkCard bookmark={bookmark} key={bookmark.id} />)}</div>
          ) : <EmptyState title="Nothing matched" message="Try a title, website, tag, or category name." />}
        </section>
      ) : (
        <>
          <section className="content-section daily-section" aria-labelledby="daily-heading">
            <div className="section-heading">
              <div><p className="section-kicker">Position 0 · start here</p><h2 id="daily-heading">Daily</h2></div>
              <span className="sun-mark" aria-hidden="true">✦</span>
            </div>
            {daily.length ? (
              <div className="bookmark-grid">{daily.map((bookmark) => <BookmarkCard bookmark={bookmark} key={bookmark.id} />)}</div>
            ) : <EmptyState title="Your daily desk is clear" message="Use the bookmark manager to assign a Daily position." />}
          </section>

          <section className="content-section" aria-labelledby="category-heading">
            <div className="section-heading">
              <div><p className="section-kicker">Browse the collection</p><h2 id="category-heading">Categories</h2></div>
              <span className="result-count">{categories.length} spaces</span>
            </div>
            <div className="category-grid">
              {categories.map((category) => <CategoryCard category={category} data={data} key={category.id} />)}
            </div>
          </section>
        </>
      )}
    </main>
  )
}
