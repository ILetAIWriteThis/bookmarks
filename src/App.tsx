import { useEffect, useMemo, useState } from 'react'
import { AppHeader } from './components/AppHeader'
import { validateBookmarkData } from './data'
import { Icon } from './icons'
import { CategoryPage } from './pages/CategoryPage'
import { HomePage } from './pages/HomePage'
import { V2Page } from './pages/V2Page'
import { activateUpdate, usePwa } from './pwa'
import type { BookmarkData } from './types'

interface AppProps {
  data?: BookmarkData
}

type Route = { page: 'collection'; collection: 'web' | 'youtube' }
  | { page: 'old' }
  | { page: 'old-category'; categoryId: string }

function readRoute(): Route {
  const hash = window.location.hash
  if (/^#\/(?:old|v0\.10-old)\/?$/.test(hash)) return { page: 'old' }
  const category = hash.match(/^#\/(?:old\/category|v0\.10-old\/category|category)\/([^/?#]+)/)
  if (category) {
    try { return { page: 'old-category', categoryId: decodeURIComponent(category[1]) } }
    catch { return { page: 'old-category', categoryId: category[1] } }
  }
  if (/^#\/(?:youtube|v2\/youtube)\/?$/.test(hash)) return { page: 'collection', collection: 'youtube' }
  return { page: 'collection', collection: 'web' }
}

function useRoute() {
  const [route, setRoute] = useState(readRoute)
  useEffect(() => {
    const update = () => { setRoute(readRoute()); window.scrollTo({ top: 0 }) }
    window.addEventListener('hashchange', update)
    return () => window.removeEventListener('hashchange', update)
  }, [])
  return route
}

export function App({ data: providedData }: AppProps) {
  const [data, setData] = useState<BookmarkData | null>(providedData ?? null)
  const [error, setError] = useState<string | null>(null)
  const [offlineCache, setOfflineCache] = useState(false)
  const route = useRoute()
  const pwa = usePwa()
  const oldData = useMemo(() => data && ({
    categories: data.categories,
    bookmarks: data.bookmarks.filter((bookmark) => !bookmark.placement),
  }), [data])

  useEffect(() => {
    if (providedData) return
    const controller = new AbortController()
    fetch(`${import.meta.env.BASE_URL}data/bookmarks.json`, { signal: controller.signal })
      .then((response) => {
        setOfflineCache(response.headers.get('X-Bookmarks-Offline') === 'true')
        if (!response.ok) throw new Error(`Could not load bookmark data (${response.status})`)
        return response.json() as Promise<unknown>
      })
      .then((value) => setData(validateBookmarkData(value)))
      .catch((reason: unknown) => {
        if ((reason as Error).name !== 'AbortError') setError(reason instanceof Error ? reason.message : 'Could not load bookmark data')
      })
    return () => controller.abort()
  }, [providedData])

  const install = pwa.install ? async () => { await pwa.install?.prompt() } : undefined

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <AppHeader onInstall={install} />
      {!data && !error && <main id="main-content" className="status-page"><span className="loader" /><p>Opening your bookmarks…</p></main>}
      {error && (
        <main id="main-content" className="status-page status-page--error">
          <Icon name="bookmark" size={34} />
          <h1>Bookmarks couldn’t open</h1>
          <p>{error}</p>
          <button type="button" onClick={() => window.location.reload()}>Try again</button>
        </main>
      )}
      {data && oldData && (route.page === 'collection' ? <V2Page data={data} collection={route.collection} />
        : route.page === 'old' ? <HomePage data={oldData} />
          : <CategoryPage data={oldData} categoryId={route.categoryId} />)}

      {(!pwa.online || offlineCache) && <div className="notice" role="status"><span>You’re offline</span><small>Saved pages still work; external bookmarks need a connection.</small></div>}
      {pwa.update && (
        <div className="notice notice--update" role="status">
          <span>A fresh version is ready.</span>
          <button type="button" onClick={() => activateUpdate(pwa.update!)}>Update now</button>
        </div>
      )}
      <footer><span>Bookmarks</span><span>Made for getting somewhere.</span></footer>
    </div>
  )
}
