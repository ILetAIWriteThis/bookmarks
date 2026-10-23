/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

const source = readFileSync('public/sw.js', 'utf8')
const scope = 'https://bookmarks.example/bookmarks/'

function worker(offline = false) {
  const listeners = new Map<string, (event: unknown) => void>()
  const stale = new Response('old bookmarks')
  const cache = { put: vi.fn(), match: vi.fn(async () => stale.clone()) }
  const network = vi.fn(async (_request: unknown, options?: RequestInit) => {
    if (offline) throw new TypeError('Offline')
    return new Response(options?.cache === 'no-store' ? 'updated bookmarks' : 'old bookmarks')
  })
  runInNewContext(source, {
    self: {
      registration: { scope }, location: new URL(scope),
      addEventListener: (type: string, listener: (event: unknown) => void) => listeners.set(type, listener),
    },
    URL, Headers, Response, Request, fetch: network,
    caches: { open: async () => cache, match: cache.match },
  })
  return { listeners, cache, network }
}

it.each(['data/bookmarks.json', ''])('bypasses stale HTTP cache for %s and refreshes offline storage', async (path) => {
  const { listeners, cache } = worker()
  let pending: Promise<Response> | undefined
  listeners.get('fetch')!({
    request: { method: 'GET', url: scope + path, mode: path ? 'cors' : 'navigate' },
    respondWith: (response: Promise<Response>) => { pending = response },
  })
  const response = await pending!
  expect(await response.text()).toBe('updated bookmarks')
  expect(cache.put).toHaveBeenCalledOnce()
  expect(await (cache.put.mock.calls[0][1] as Response).text()).toBe('updated bookmarks')
})

it('continues serving saved bookmarks when the network is unavailable', async () => {
  const { listeners } = worker(true)
  let pending: Promise<Response> | undefined
  listeners.get('fetch')!({
    request: { method: 'GET', url: scope + 'data/bookmarks.json', mode: 'cors' },
    respondWith: (response: Promise<Response>) => { pending = response },
  })
  const response = await pending!
  expect(await response.text()).toBe('old bookmarks')
  expect(response.headers.get('X-Bookmarks-Offline')).toBe('true')
})
