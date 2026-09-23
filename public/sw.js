const VERSION = 'bookmarks-shell-v11'
const scopeUrl = new URL(self.registration.scope)
const indexUrl = new URL('./index.html', scopeUrl)
const dataUrl = new URL('./data/bookmarks.json', scopeUrl)
const mediaDataUrl = new URL('./data/media.json', scopeUrl)
const shellFiles = [
  './', './index.html', './manifest.webmanifest', './data/bookmarks.json', './data/media.json',
  './icons/icon.svg', './icons/maskable.svg',
].map((path) => new URL(path, scopeUrl).href)

function offlineResponse(response) {
  const headers = new Headers(response.headers)
  headers.set('X-Bookmarks-Offline', 'true')
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION)
    await cache.addAll(shellFiles)
    const index = await cache.match(indexUrl)
    const markup = await index.clone().text()
    const assetUrls = [...markup.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
      .map((match) => new URL(match[1], indexUrl))
      .filter((url) => url.origin === scopeUrl.origin && url.href.startsWith(scopeUrl.href))
      .map((url) => url.href)
    await cache.addAll([...new Set(assetUrls)])
  })())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  if (request.mode === 'navigate' || url.href === dataUrl.href || url.href === mediaDataUrl.href) {
    event.respondWith((async () => {
      try {
        const response = await fetch(request)
        if (response.ok) {
          const cache = await caches.open(VERSION)
          await cache.put(request.mode === 'navigate' ? indexUrl : request, response.clone())
        }
        return response
      } catch {
        const cached = await caches.match(request.mode === 'navigate' ? indexUrl : request, { ignoreVary: true })
        if (cached) return url.href === dataUrl.href || url.href === mediaDataUrl.href ? offlineResponse(cached) : cached
        if (request.mode === 'navigate') {
          const root = await caches.match(new URL('./', scopeUrl), { ignoreVary: true })
          if (root) return root
        }
        return Response.error()
      }
    })())
    return
  }

  event.respondWith((async () => {
    const cached = await caches.match(request, { ignoreVary: true })
    if (cached) return cached
    try {
      const response = await fetch(request)
      if (response.ok) {
        const cache = await caches.open(VERSION)
        await cache.put(request, response.clone())
      }
      return response
    } catch {
      return Response.error()
    }
  })())
})
