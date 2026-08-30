import { useEffect, useState } from 'react'
import { AppHeader } from './components/AppHeader'
import { validateBookmarkData } from './data'
import { Icon } from './icons'
import { CategoryPage } from './pages/CategoryPage'
import { HomePage } from './pages/HomePage'
import { activateUpdate, usePwa } from './pwa'
import type { BookmarkData } from './types'

interface AppProps {
  data?: BookmarkData
}

type Route = { page: 'home' } | { page: 'category'; categoryId: string }

function readRoute(): Route {
  const match = window.location.hash.match(/^#\/category\/([^/?#]+)/)
  if (!match) return { page: 'home' }
  try { return { page: 'category', categoryId: decodeURIComponent(match[1]) } }
  catch { return { page: 'category', categoryId: match[1] } }
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
      {data && (route.page === 'home' ? <HomePage data={data} /> : <CategoryPage data={data} categoryId={route.categoryId} />)}

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
