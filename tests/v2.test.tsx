import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '../src/App'
import { v2Bookmarks } from '../src/v2'
import type { BookmarkData } from '../src/types'
import { testData } from './fixtures'

const data: BookmarkData = {
  categories: [...testData.categories,
    { id: 'youtube', name: 'YouTube', position: 4 },
    { id: 'youtube-top', name: 'Top', position: 1, parentId: 'youtube' },
    { id: 'science', name: 'Science', position: 2, parentId: 'youtube' },
  ],
  bookmarks: [...testData.bookmarks.map((bookmark) => ({
    ...bookmark, tags: [...(bookmark.tags ?? []), 'daily'],
    placement: { collection: 'web' as const, position: bookmark.dailyPosition! },
  })),
    { id: 'later', title: 'Later channel', url: 'https://www.youtube.com/@later',
      placement: { collection: 'youtube', position: 8 }, categories: [{ categoryId: 'youtube-top', position: 8 }] },
    { id: 'first', title: 'First channel', url: 'https://www.youtube.com/@first', subscribed: false,
      tags: ['SCIENCE', 'science'], placement: { collection: 'youtube', position: 0 },
      categories: [{ categoryId: 'youtube-top', position: 0 }, { categoryId: 'science', position: 1 }] },
    { id: 'outside', title: 'Outside Top', url: 'https://www.youtube.com/@outside',
      categories: [{ categoryId: 'science', position: -1 }] },
  ],
}

function navigate(hash: string) {
  window.location.hash = hash
  fireEvent(window, new HashChangeEvent('hashchange'))
}

const listeningData: BookmarkData = {
  ...data,
  bookmarks: data.bookmarks.map((bookmark) => bookmark.id === 'first'
    ? { ...bookmark, tags: [...(bookmark.tags ?? []), 'listening'] } : bookmark),
}

it('keeps listening choices across reloads without changing stars, other tags, or saved order', async () => {
  const user = userEvent.setup()
  const original = JSON.stringify(listeningData)
  localStorage.setItem('bookmarks:starred:v1', JSON.stringify(['first']))
  window.location.hash = '#/youtube'
  const view = render(<App data={listeningData} />)
  const toggle = screen.getByRole('button', { name: 'Listening for First channel' })
  expect(toggle).toHaveAttribute('aria-pressed', 'true')
  await user.click(toggle)
  expect(toggle).toHaveAttribute('aria-pressed', 'false')
  expect(localStorage.getItem('bookmarks:listening:v1')).toBe('{"first":false}')
  expect(localStorage.getItem('bookmarks:starred:v1')).toBe('["first"]')
  const list = screen.getByRole('list', { name: 'YouTube bookmarks' })
  expect(within(list).getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
    'https://www.youtube.com/@first', 'https://www.youtube.com/@later',
  ])
  expect(within(list).getByText('#science')).toBeInTheDocument()
  expect(within(list).queryByText('#listening')).not.toBeInTheDocument()
  await user.type(screen.getByRole('searchbox'), 'listening')
  expect(list.children).toHaveLength(0)
  view.unmount()
  render(<App data={listeningData} />)
  expect(screen.getByRole('button', { name: 'Listening for First channel' })).toHaveAttribute('aria-pressed', 'false')
  expect(JSON.stringify(listeningData)).toBe(original)
})

it('controls starred Listen and Watch independently and restores defaults from a filtered view', async () => {
  const user = userEvent.setup()
  localStorage.setItem('bookmarks:starred:v1', JSON.stringify(['later', 'first', 'alpha']))
  window.location.hash = '#/starred'
  render(<App data={listeningData} />)
  const scopes = screen.getByRole('group', { name: 'Filter starred by collection' })
  const list = screen.getByRole('list', { name: 'Starred bookmarks' })
  await user.click(within(scopes).getByRole('button', { name: 'YouTube Listen' }))
  expect(within(list).getByRole('link')).toHaveAttribute('href', 'https://www.youtube.com/@first')
  await user.click(screen.getByRole('button', { name: 'Listening for First channel' }))
  expect(list.children).toHaveLength(0)
  await user.click(within(scopes).getByRole('button', { name: 'YouTube Watch' }))
  expect(within(list).getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
    'https://www.youtube.com/@later',
  ])
  await user.click(screen.getByRole('button', { name: 'Listening for Later channel' }))
  expect(within(list).getByRole('link')).toHaveAttribute('href', 'https://www.youtube.com/@later')
  navigate('#/youtube')
  await user.click(screen.getByText('Filter by tags'))
  await user.click(screen.getByRole('button', { name: '#listening' }))
  expect(within(screen.getByRole('list')).getByRole('link')).toHaveAttribute('href', 'https://www.youtube.com/@later')
  await user.click(screen.getByRole('button', { name: 'Reset listening choices' }))
  expect(localStorage.getItem('bookmarks:listening:v1')).toBeNull()
  expect(within(screen.getByRole('list')).getByRole('link')).toHaveAttribute('href', 'https://www.youtube.com/@first')
  navigate('#/starred')
  expect(within(list).getByRole('link')).toHaveAttribute('href', 'https://www.youtube.com/@later')
})

it('keeps channels in both starred scopes across reloads and controls Watch independently', async () => {
  const user = userEvent.setup()
  const original = JSON.stringify(listeningData)
  localStorage.setItem('bookmarks:starred:v1', '["later","first"]')
  window.location.hash = '#/starred'
  const view = render(<App data={listeningData} />)
  const scope = (name: string) => within(screen.getByRole('group', { name: 'Filter starred by collection' }))
    .getByRole('button', { name })
  const titles = () => within(screen.getByRole('list', { name: 'Starred bookmarks' }))
    .queryAllByRole('link').map((link) => link.querySelector('strong')!.textContent)
  await user.click(screen.getByRole('button', { name: 'Watching for First channel' }))
  await user.click(screen.getByRole('button', { name: 'Listening for Later channel' }))
  for (const name of ['YouTube Watch', 'YouTube Listen']) {
    await user.click(scope(name))
    expect(titles()).toEqual(['Later channel', 'First channel'])
    expect(scope(name)).toHaveTextContent('2')
  }
  view.unmount()
  render(<App data={listeningData} />)
  await user.click(scope('YouTube Watch'))
  expect(titles()).toEqual(['Later channel', 'First channel'])
  await user.click(screen.getByRole('button', { name: 'Watching for First channel' }))
  expect(titles()).toEqual(['Later channel'])
  await user.click(scope('YouTube Listen'))
  expect(titles()).toEqual(['Later channel', 'First channel'])
  expect(screen.getByRole('button', { name: 'Watching for First channel' })).toHaveAttribute('aria-pressed', 'false')
  await user.click(screen.getByRole('button', { name: 'Reset listening choices' }))
  await user.click(screen.getByRole('button', { name: 'Reset Watch choices' }))
  await user.click(scope('YouTube Watch'))
  expect(titles()).toEqual(['Later channel'])
  expect(localStorage.getItem('bookmarks:watching:v1')).toBeNull()
  expect(localStorage.getItem('bookmarks:starred:v1')).toBe('["later","first"]')
  expect(JSON.stringify(listeningData)).toBe(original)
})

it.each(['invalid json', '[]', 'null', '{"first":"true"}'])('uses Watch defaults for invalid stored choices: %s', (stored) => {
  localStorage.setItem('bookmarks:watching:v1', stored)
  window.location.hash = '#/youtube'
  render(<App data={listeningData} />)
  expect(screen.getByRole('button', { name: 'Watching for First channel' })).toHaveAttribute('aria-pressed', 'false')
  expect(screen.getByRole('button', { name: 'Watching for Later channel' })).toHaveAttribute('aria-pressed', 'true')
})

it('syncs Watch choices and storage clearing from another tab', () => {
  window.location.hash = '#/youtube'
  render(<App data={listeningData} />)
  const toggle = screen.getByRole('button', { name: 'Watching for First channel' })
  localStorage.setItem('bookmarks:watching:v1', '{"first":true}')
  fireEvent(window, new StorageEvent('storage', { key: 'bookmarks:watching:v1' }))
  expect(toggle).toHaveAttribute('aria-pressed', 'true')
  localStorage.clear()
  fireEvent(window, new StorageEvent('storage', { key: null }))
  expect(toggle).toHaveAttribute('aria-pressed', 'false')
})

it.each(['invalid json', '[]', 'null', '{"first":"false"}'])('uses saved listening tags when local storage contains %s', (stored) => {
  localStorage.setItem('bookmarks:listening:v1', stored)
  window.location.hash = '#/youtube'
  render(<App data={listeningData} />)
  expect(screen.getByRole('button', { name: 'Listening for First channel' })).toHaveAttribute('aria-pressed', 'true')
})

it('syncs listening changes and storage clearing from another tab', () => {
  window.location.hash = '#/youtube'
  render(<App data={listeningData} />)
  const toggle = screen.getByRole('button', { name: 'Listening for First channel' })
  localStorage.setItem('bookmarks:listening:v1', '{"first":false}')
  fireEvent(window, new StorageEvent('storage', { key: 'bookmarks:listening:v1' }))
  expect(toggle).toHaveAttribute('aria-pressed', 'false')
  localStorage.clear()
  fireEvent(window, new StorageEvent('storage', { key: null }))
  expect(toggle).toHaveAttribute('aria-pressed', 'true')
})

it('keeps listening usable for the session if saving is blocked', async () => {
  const user = userEvent.setup()
  window.location.hash = '#/youtube'
  render(<App data={listeningData} />)
  const save = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage blocked') })
  try {
    const toggle = screen.getByRole('button', { name: 'Listening for First channel' })
    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByText(/couldn’t save your listening choices/)).toHaveAttribute('role', 'status')
    expect(screen.getByText(/couldn’t save your Watch choices/)).toHaveAttribute('role', 'status')
  } finally {
    save.mockRestore()
  }
})

it('opens a random bookmark from the active collection and current results', async () => {
  const user = userEvent.setup()
  const open = vi.spyOn(window, 'open').mockImplementation(() => null)
  const random = vi.spyOn(Math, 'random').mockReturnValue(0)
  window.location.hash = '#/'
  render(<App data={data} />)
  const lucky = screen.getByRole('button', { name: 'Get Lucky' })
  await user.click(lucky)
  expect(open).toHaveBeenLastCalledWith('https://alpha.example/news', '_blank', 'noopener,noreferrer')
  random.mockReturnValue(0.999)
  await user.click(lucky)
  expect(open).toHaveBeenLastCalledWith('https://example.com/journal', '_blank', 'noopener,noreferrer')
  navigate('#/youtube')
  await user.click(lucky)
  expect(open).toHaveBeenLastCalledWith('https://www.youtube.com/@later', '_blank', 'noopener,noreferrer')
  await user.click(screen.getByText('Filter by tags'))
  await user.click(screen.getByRole('button', { name: '#science' }))
  await user.click(lucky)
  expect(open).toHaveBeenLastCalledWith('https://www.youtube.com/@first', '_blank', 'noopener,noreferrer')
  await user.type(screen.getByRole('searchbox'), 'no matching bookmark')
  expect(lucky).toBeDisabled()
  open.mockClear()
  await user.click(lucky)
  expect(open).not.toHaveBeenCalled()
  random.mockRestore()
  open.mockRestore()
})

it('opens only the currently visible starred bookmarks in separate tabs', async () => {
  const user = userEvent.setup()
  const tabs: { document: Document; opener: unknown; location: { replace: ReturnType<typeof vi.fn> } }[] = []
  const open = vi.spyOn(window, 'open').mockImplementation(() => {
    const tab = { document: document.implementation.createHTMLDocument(), opener: window, location: { replace: vi.fn() } }
    tabs.push(tab)
    return tab as unknown as Window
  })
  localStorage.setItem('bookmarks:starred:v1', JSON.stringify(['later', 'example', 'first', 'alpha']))
  window.location.hash = '#/starred'
  render(<App data={data} />)
  const list = screen.getByRole('list', { name: 'Starred bookmarks' })
  const openVisible = async (count: number) => {
    open.mockClear()
    tabs.length = 0
    const urls = within(list).getAllByRole('link').map((link) => link.getAttribute('href'))
    await user.click(screen.getByRole('button', { name: `Open all (${count})` }))
    expect(open.mock.calls).toEqual(urls.map(() => ['about:blank', '_blank']))
    expect(tabs.map((tab) => tab.document.querySelector('a')?.href)).toEqual(urls)
    for (const tab of tabs) {
      expect(tab.opener).toBeNull()
      expect(tab.document.querySelector('a')?.rel).toBe('noopener noreferrer')
      expect(tab.document.querySelector('a')?.referrerPolicy).toBe('no-referrer')
    }
    expect(open).toHaveBeenCalledTimes(count)
  }
  try {
    await openVisible(4)
    const scopes = screen.getByRole('group', { name: 'Filter starred by collection' })
    await user.click(within(scopes).getByRole('button', { name: 'YouTube' }))
    await openVisible(2)
    await user.click(screen.getByText('Filter by tags'))
    await user.click(screen.getByRole('button', { name: '#science' }))
    await openVisible(1)
    await user.click(within(scopes).getByRole('button', { name: 'All' }))
    await user.click(screen.getByRole('button', { name: 'Exclude tags' }))
    await user.click(screen.getByRole('button', { name: '#science' }))
    await openVisible(3)
    await user.type(screen.getByRole('searchbox'), 'channel')
    await openVisible(1)
    await user.type(screen.getByRole('searchbox'), ' no match')
    open.mockClear()
    const empty = screen.getByRole('button', { name: 'Open all (0)' })
    expect(empty).toBeDisabled()
    await user.click(empty)
    expect(open).not.toHaveBeenCalled()
    navigate('#/')
    expect(screen.queryByRole('button', { name: /^Open all/ })).not.toBeInTheDocument()
  } finally {
    open.mockRestore()
  }
})

it('reports blocked tabs and retries only remaining bookmarks until the view changes', async () => {
  const user = userEvent.setup()
  const replace = vi.fn()
  const openedTab = () => {
    const tabDocument = document.implementation.createHTMLDocument()
    const createElement = tabDocument.createElement.bind(tabDocument)
    vi.spyOn(tabDocument, 'createElement').mockImplementation((tag: string) => {
      const element = createElement(tag)
      if (element instanceof HTMLAnchorElement) element.click = () => replace(element.href)
      return element
    })
    return { document: tabDocument, opener: window } as unknown as Window
  }
  const open = vi.spyOn(window, 'open').mockImplementation(() => null).mockImplementationOnce(openedTab)
  localStorage.setItem('bookmarks:starred:v1', JSON.stringify(['later', 'example', 'first', 'alpha']))
  window.location.hash = '#/starred'
  render(<App data={data} />)
  try {
    await user.click(screen.getByRole('button', { name: 'Open all (4)' }))
    expect(screen.getByRole('status')).toHaveTextContent('Your browser blocked 3 tabs. Allow pop-ups for this site')
    expect(replace).toHaveBeenCalledExactlyOnceWith('https://www.youtube.com/@later')
    open.mockClear()
    replace.mockClear()
    open.mockImplementation(openedTab)
    await user.click(screen.getByRole('button', { name: 'Open remaining (3)' }))
    expect(replace.mock.calls).toEqual([
      ['https://example.com/journal'], ['https://www.youtube.com/@first'], ['https://alpha.example/news'],
    ])
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    open.mockImplementation(() => null)
    await user.click(screen.getByRole('button', { name: 'Open all (4)' }))
    expect(screen.getByRole('button', { name: 'Open remaining (4)' })).toBeInTheDocument()
    await user.type(screen.getByRole('searchbox'), 'First')
    expect(screen.getByRole('button', { name: 'Open all (1)' })).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  } finally {
    open.mockRestore()
  }
})

it('projects the seed collections without mutating data and prioritizes position over subscription', () => {
  const original = JSON.stringify(data)
  expect(v2Bookmarks(data, 'web').map((entry) => entry.bookmark.id)).toEqual(['alpha', 'example'])
  const youtube = v2Bookmarks(data, 'youtube')
  expect(youtube.map((entry) => entry.position)).toEqual([0, 8])
  expect(youtube[0].tags).toEqual(['science'])
  expect(youtube[1].tags).toEqual([])
  expect(v2Bookmarks(data, 'web')[0].tags).toEqual(['daily'])
  expect(JSON.stringify(data)).toBe(original)
})

it('shows reviewed Web bookmarks at the default route and filters without changing saved positions', async () => {
  const user = userEvent.setup()
  render(<App data={data} />)
  const list = screen.getByRole('list', { name: 'Web bookmarks' })
  expect(within(list).getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
    'https://alpha.example/news', 'https://example.com/journal',
  ])
  const filters = screen.getByText('Filter by tags').closest('details')!
  expect(filters).not.toHaveAttribute('open')
  await user.click(screen.getByText('Filter by tags'))
  expect(filters).toHaveAttribute('open')
  expect(screen.getByRole('button', { name: '#daily' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: '#news' })).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: '#daily' }))
  await user.click(screen.getByRole('button', { name: '#analysis' }))
  expect(within(list).getAllByRole('link')).toHaveLength(1)
  expect(within(list).getByLabelText('Position 2')).toBeInTheDocument()
  expect(screen.queryByText('1 of 2')).not.toBeInTheDocument()
  expect(within(list).getByRole('link')).toHaveAttribute('rel', 'noopener noreferrer')
  await user.click(screen.getByRole('button', { name: 'All' }))
  expect(within(list).getAllByRole('link')).toHaveLength(2)
  navigate('#/old')
  expect(screen.getByRole('list', { name: 'Web bookmarks' })).toBeInTheDocument()
  expect(screen.queryByRole('link', { name: 'Old bookmarks' })).not.toBeInTheDocument()
  navigate('#/old/category/science')
  expect(screen.getByRole('list', { name: 'Web bookmarks' })).toBeInTheDocument()
})

it('keeps collection filters separate and supports direct YouTube routes', async () => {
  const user = userEvent.setup()
  window.location.hash = '#/youtube'
  render(<App data={data} />)
  expect(screen.getByRole('list', { name: 'YouTube bookmarks' }).children).toHaveLength(2)
  await user.click(screen.getByText('Filter by tags'))
  expect(screen.queryByRole('button', { name: '#youtube' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: '#top' })).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: '#science' }))
  expect(screen.getByRole('list').children).toHaveLength(1)
  navigate('#/')
  expect(screen.getByRole('list').children).toHaveLength(2)
  await user.click(screen.getByRole('button', { name: '#analysis' }))
  navigate('#/youtube')
  expect(screen.getByRole('button', { name: '#science' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('list').children).toHaveLength(1)
})

it('searches titles, descriptions, websites, and tags alongside selected tags', async () => {
  const user = userEvent.setup()
  window.location.hash = '#/'
  render(<App data={data} />)
  const list = screen.getByRole('list', { name: 'Web bookmarks' })
  const search = screen.getByRole('searchbox', { name: 'Search Web bookmarks' })
  await user.type(search, 'ALPHA')
  expect(within(list).getAllByRole('link')).toHaveLength(1)
  expect(screen.queryByText('1 of 2')).not.toBeInTheDocument()
  await user.clear(search)
  await user.type(search, 'reporting')
  expect(within(list).getByRole('link')).toHaveAttribute('href', 'https://example.com/journal')
  await user.clear(search)
  await user.type(search, 'alpha.example')
  expect(within(list).getByRole('link')).toHaveAttribute('href', 'https://alpha.example/news')
  await user.clear(search)
  await user.type(search, '#analysis')
  expect(within(list).getByRole('link')).toHaveAttribute('href', 'https://example.com/journal')
  await user.click(screen.getByText('Filter by tags'))
  await user.click(screen.getByRole('button', { name: '#daily' }))
  expect(within(list).getAllByRole('link')).toHaveLength(1)
  await user.click(screen.getByRole('button', { name: '#analysis' }))
  await user.clear(search)
  await user.type(search, 'alpha')
  expect(screen.getByText('No bookmarks match your search and tags.')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Clear search' }))
  expect(within(list).getByRole('link')).toHaveAttribute('href', 'https://example.com/journal')
})

it('explains empty seed collections and nonmatching filter combinations', async () => {
  const user = userEvent.setup()
  window.location.hash = '#/'
  const { unmount } = render(<App data={{ ...data, bookmarks: [] }} />)
  expect(screen.getByText('No bookmarks here yet.')).toBeInTheDocument()
  unmount()
  render(<App data={{ ...data, bookmarks: data.bookmarks.map((bookmark) => bookmark.id === 'alpha' ? { ...bookmark, tags: ['exclusive'] } : bookmark) }} />)
  await user.click(screen.getByText('Filter by tags'))
  await user.click(screen.getByRole('button', { name: '#exclusive' }))
  await user.click(screen.getByRole('button', { name: '#analysis' }))
  expect(screen.getByText('No bookmarks match these tags.')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'All' }))
  expect(screen.getByRole('list').children).toHaveLength(2)
})

it.each(['#/media', '#/travel'])('falls back to Web for removed route %s', (hash) => {
  window.location.hash = hash
  render(<App data={data} />)
  expect(screen.getByRole('list', { name: 'Web bookmarks' }).children).toHaveLength(2)
  const navigation = screen.getByRole('navigation', { name: 'Bookmark collections' })
  expect(within(navigation).getAllByRole('link')).toHaveLength(3)
  expect(within(navigation).queryByRole('link', { name: 'Media' })).not.toBeInTheDocument()
  expect(within(navigation).queryByRole('link', { name: 'Travel' })).not.toBeInTheDocument()
})


it('keeps first-starred order across reloads without changing saved collection positions', async () => {
  const user = userEvent.setup()
  const original = JSON.stringify(data)
  window.location.hash = '#/youtube'
  const { unmount } = render(<App data={data} />)
  await user.click(screen.getByRole('button', { name: 'Star Later channel' }))
  await user.click(screen.getByRole('button', { name: 'Star First channel' }))
  expect(screen.getByRole('button', { name: 'Unstar Later channel' })).toHaveAttribute('aria-pressed', 'true')
  navigate('#/')
  await user.click(screen.getByRole('button', { name: 'Star Alpha News' }))
  unmount()
  window.location.hash = '#/starred'
  render(<App data={data} />)
  const list = screen.getByRole('list', { name: 'Starred bookmarks' })
  expect(within(list).getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
    'https://www.youtube.com/@later', 'https://www.youtube.com/@first', 'https://alpha.example/news',
  ])
  expect(within(list).getByLabelText('Position 8')).toBeInTheDocument()
  const scopes = screen.getByRole('group', { name: 'Filter starred by collection' })
  await user.click(within(scopes).getByRole('button', { name: 'YouTube' }))
  expect(within(list).getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
    'https://www.youtube.com/@later', 'https://www.youtube.com/@first',
  ])
  await user.type(screen.getByRole('searchbox'), 'channel')
  expect(within(list).getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
    'https://www.youtube.com/@later', 'https://www.youtube.com/@first',
  ])
  await user.click(screen.getByRole('button', { name: 'Clear search' }))
  await user.click(within(scopes).getByRole('button', { name: 'All' }))
  await user.click(screen.getByRole('button', { name: 'Unstar Later channel' }))
  navigate('#/youtube')
  await user.click(screen.getByRole('button', { name: 'Star Later channel' }))
  navigate('#/starred')
  expect(within(list).getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
    'https://www.youtube.com/@first', 'https://alpha.example/news', 'https://www.youtube.com/@later',
  ])
  await user.click(screen.getByRole('button', { name: 'Unstar First channel' }))
  await user.click(screen.getByRole('button', { name: 'Unstar Later channel' }))
  await user.click(screen.getByRole('button', { name: 'Unstar Alpha News' }))
  expect(screen.getByText('No starred bookmarks yet.')).toBeInTheDocument()
  navigate('#/youtube')
  expect(screen.getByRole('list').children).toHaveLength(2)
  expect(JSON.stringify(data)).toBe(original)
})

it('handles invalid stored stars and reports unavailable browser storage', async () => {
  localStorage.setItem('bookmarks:starred:v1', '{broken')
  window.location.hash = '#/starred'
  const user = userEvent.setup()
  render(<App data={data} />)
  expect(screen.getByText('No starred bookmarks yet.')).toBeInTheDocument()
  navigate('#/youtube')
  const storage = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage blocked') })
  try {
    await user.click(screen.getByRole('button', { name: 'Star First channel' }))
    expect(screen.getByRole('status')).toHaveTextContent('Your browser couldn’t save these stars.')
    navigate('#/starred')
    expect(screen.getByRole('list').children).toHaveLength(1)
  } finally {
    storage.mockRestore()
  }
})

it('limits a large tag list, searches all tags, and keeps selected tags accessible', async () => {
  const user = userEvent.setup()
  window.location.hash = '#/youtube'
  const tags = Array.from({ length: 110 }, (_, index) => `topic-${String(index).padStart(3, '0')}`)
  render(<App data={{ ...data, bookmarks: data.bookmarks.map((bookmark) => bookmark.id === 'first' ? { ...bookmark, tags } : bookmark) }} />)
  await user.click(screen.getByText('Filter by tags'))
  const filters = screen.getByText('Filter by tags').closest('details')!
  expect(within(filters).getAllByRole('button', { name: /^#topic-/ })).toHaveLength(12)
  expect(screen.queryByRole('button', { name: '#topic-109' })).not.toBeInTheDocument()
  await user.type(screen.getByRole('textbox', { name: 'Find a tag' }), '#TOPIC-109')
  await user.click(screen.getByRole('button', { name: '#topic-109' }))
  expect(screen.getByRole('list').children).toHaveLength(1)
  await user.clear(screen.getByRole('textbox', { name: 'Find a tag' }))
  expect(screen.getByRole('button', { name: '#topic-109' })).toHaveAttribute('aria-pressed', 'true')
  await user.click(screen.getByRole('button', { name: 'Show all 110 tags' }))
  expect(within(filters).getAllByRole('button', { name: /^#topic-/ })).toHaveLength(110)
  await user.click(screen.getByRole('button', { name: 'Show fewer tags' }))
  expect(within(filters).getAllByRole('button', { name: /^#topic-/ })).toHaveLength(13)
  await user.click(screen.getByRole('button', { name: '#topic-109' }))
  expect(screen.getByRole('list').children).toHaveLength(2)
})


it('filters starred bookmarks by collection with counts and keeps search active', async () => {
  const user = userEvent.setup()
  localStorage.setItem('bookmarks:starred:v1', JSON.stringify(['alpha', 'first', 'later']))
  window.location.hash = '#/starred'
  render(<App data={data} />)
  const scopes = screen.getByRole('group', { name: 'Filter starred by collection' })
  const list = screen.getByRole('list', { name: 'Starred bookmarks' })
  expect(list.children).toHaveLength(3)
  expect(within(scopes).getByRole('button', { name: 'Web' })).toHaveTextContent('Web1')
  expect(within(scopes).getByRole('button', { name: 'YouTube' })).toHaveTextContent('YouTube2')
  await user.click(within(scopes).getByRole('button', { name: 'YouTube' }))
  expect(list.children).toHaveLength(2)
  expect(within(list).getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
    'https://www.youtube.com/@first', 'https://www.youtube.com/@later',
  ])
  await user.click(screen.getByText('Filter by tags'))
  await user.click(screen.getByRole('button', { name: '#science' }))
  expect(list.children).toHaveLength(1)
  await user.click(within(scopes).getByRole('button', { name: 'Web' }))
  expect(list.children).toHaveLength(1)
  expect(within(list).getByRole('link')).toHaveAttribute('href', 'https://alpha.example/news')
  expect(screen.queryByRole('button', { name: '#science' })).not.toBeInTheDocument()
  await user.type(screen.getByRole('searchbox'), 'First')
  expect(list.children).toHaveLength(0)
  await user.click(within(scopes).getByRole('button', { name: 'YouTube' }))
  expect(list.children).toHaveLength(1)
  await user.click(screen.getByRole('button', { name: 'Clear search' }))
  await user.click(screen.getByRole('button', { name: 'Unstar First channel' }))
  await user.click(screen.getByRole('button', { name: 'Unstar Later channel' }))
  expect(screen.getByText('No starred YouTube bookmarks yet.')).toBeInTheDocument()
  await user.click(within(scopes).getByRole('button', { name: 'All' }))
  expect(list.children).toHaveLength(1)
  navigate('#/')
  expect(screen.queryByRole('group', { name: 'Filter starred by collection' })).not.toBeInTheDocument()
})

it('splits starred YouTube bookmarks by the normalized listening tag and preserves starred order', async () => {
  const user = userEvent.setup()
  const splitData: BookmarkData = {
    ...data,
    bookmarks: [
      ...data.bookmarks.map((bookmark) => ['first', 'alpha'].includes(bookmark.id)
        ? { ...bookmark, tags: [...(bookmark.tags ?? []), 'LISTENING'] } : bookmark),
      { id: 'audio', title: 'Audio channel', url: 'https://www.youtube.com/@audio', tags: ['listening'],
        placement: { collection: 'youtube', position: 9 }, categories: [] },
      { id: 'unstarred', title: 'Unstarred audio', url: 'https://www.youtube.com/@unstarred', tags: ['listening'],
        placement: { collection: 'youtube', position: 10 }, categories: [] },
    ],
  }
  localStorage.setItem('bookmarks:starred:v1', JSON.stringify(['later', 'alpha', 'audio', 'first']))
  window.location.hash = '#/starred'
  render(<App data={splitData} />)
  const scopes = screen.getByRole('group', { name: 'Filter starred by collection' })
  const list = screen.getByRole('list', { name: 'Starred bookmarks' })
  const titles = () => within(list).queryAllByRole('link').map((link) => link.querySelector('strong')!.textContent)
  const listen = within(scopes).getByRole('button', { name: 'YouTube Listen' })
  const watch = within(scopes).getByRole('button', { name: 'YouTube Watch' })
  expect(listen).toHaveTextContent('Listen2')
  expect(watch).toHaveTextContent('Watch1')
  await user.click(listen)
  expect(listen).toHaveAttribute('aria-pressed', 'true')
  expect(titles()).toEqual(['Audio channel', 'First channel'])
  await user.click(screen.getByText('Filter by tags'))
  const filters = screen.getByText('Filter by tags').closest('details')!
  await user.click(screen.getByRole('button', { name: '#science' }))
  expect(titles()).toEqual(['First channel'])
  await user.click(within(filters).getByRole('button', { name: 'All' }))
  expect(titles()).toEqual(['Audio channel', 'First channel'])
  await user.click(screen.getByRole('button', { name: 'Exclude tags' }))
  await user.click(screen.getByRole('button', { name: '#science' }))
  expect(titles()).toEqual(['Audio channel'])
  await user.click(within(filters).getByRole('button', { name: 'All' }))
  await user.type(screen.getByRole('searchbox'), 'First')
  expect(titles()).toEqual(['First channel'])
  await user.click(watch)
  expect(watch).toHaveAttribute('aria-pressed', 'true')
  expect(listen).toHaveAttribute('aria-pressed', 'false')
  expect(titles()).toEqual([])
  await user.click(screen.getByRole('button', { name: 'Clear search' }))
  expect(titles()).toEqual(['Later channel'])
  await user.click(screen.getByRole('button', { name: 'Unstar Later channel' }))
  expect(watch).toHaveTextContent('Watch0')
  expect(screen.getByText('No starred YouTube Watch bookmarks yet.')).toBeInTheDocument()
  await user.click(within(scopes).getByRole('button', { name: 'YouTube' }))
  expect(titles()).toEqual(['Audio channel', 'First channel'])
  await user.click(within(scopes).getByRole('button', { name: 'All' }))
  expect(titles()).toEqual(['Alpha News', 'Audio channel', 'First channel'])
})

it.each([
  { scope: 'YouTube Listen', tags: ['listening'], empty: 'YouTube Watch' },
  { scope: 'YouTube Watch', tags: [], empty: 'YouTube Listen' },
])('keeps additional include and exclude tag filters available in $scope', async ({ scope, tags, empty }) => {
  const user = userEvent.setup()
  localStorage.setItem('bookmarks:starred:v1', JSON.stringify(['first', 'later']))
  window.location.hash = '#/starred'
  render(<App data={{ ...data, bookmarks: data.bookmarks.map((bookmark) =>
    bookmark.placement?.collection === 'youtube' ? { ...bookmark, tags: [...(bookmark.tags ?? []), ...tags] } : bookmark) }} />)
  const scopes = screen.getByRole('group', { name: 'Filter starred by collection' })
  await user.click(within(scopes).getByRole('button', { name: scope }))
  const list = screen.getByRole('list', { name: 'Starred bookmarks' })
  expect(list.children).toHaveLength(2)
  await user.click(screen.getByText('Filter by tags'))
  await user.click(screen.getByRole('button', { name: '#science' }))
  expect(within(list).getByRole('link')).toHaveAttribute('href', 'https://www.youtube.com/@first')
  await user.click(screen.getByRole('button', { name: 'Exclude tags' }))
  await user.click(screen.getByRole('button', { name: '#science' }))
  expect(within(list).getByRole('link')).toHaveAttribute('href', 'https://www.youtube.com/@later')
  await user.click(within(scopes).getByRole('button', { name: empty }))
  expect(screen.getByText(`No starred ${empty} bookmarks yet.`)).toBeInTheDocument()
})

it('excludes starred tags across collections and combines exclusions with search', async () => {
  const user = userEvent.setup()
  localStorage.setItem('bookmarks:starred:v1', JSON.stringify(['alpha', 'example', 'first', 'later']))
  window.location.hash = '#/starred'
  render(<App data={{ ...data, bookmarks: data.bookmarks.map((bookmark) =>
    ['example', 'first'].includes(bookmark.id) ? { ...bookmark, tags: [...(bookmark.tags ?? []), 'podcast'] } : bookmark) }} />)
  const list = screen.getByRole('list', { name: 'Starred bookmarks' })
  await user.click(screen.getByText('Filter by tags'))
  const filters = screen.getByText('Filter by tags').closest('details')!
  await user.click(screen.getByRole('button', { name: 'Exclude tags' }))
  await user.click(screen.getByRole('button', { name: '#podcast' }))
  expect(within(list).getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
    'https://alpha.example/news', 'https://www.youtube.com/@later',
  ])
  expect(screen.getByRole('button', { name: 'Excluded: #podcast' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByText('0 included · 1 excluded')).toBeInTheDocument()
  await user.type(screen.getByRole('searchbox'), 'channel')
  expect(within(list).getByRole('link')).toHaveAttribute('href', 'https://www.youtube.com/@later')
  await user.click(screen.getByRole('button', { name: 'Clear search' }))
  await user.click(screen.getByRole('button', { name: '#daily' }))
  expect(within(list).getByRole('link')).toHaveAttribute('href', 'https://www.youtube.com/@later')
  await user.click(screen.getByRole('button', { name: 'Excluded: #daily' }))
  expect(list.children).toHaveLength(2)
  navigate('#/youtube')
  expect(screen.getByRole('list').children).toHaveLength(2)
  expect(screen.getByRole('button', { name: 'Include tags' })).toHaveAttribute('aria-pressed', 'true')
  navigate('#/starred')
  expect(list.children).toHaveLength(2)
  await user.click(within(filters).getByRole('button', { name: 'All' }))
  expect(list.children).toHaveLength(4)
  expect(screen.queryByRole('button', { name: 'Excluded: #podcast' })).not.toBeInTheDocument()
})

it('combines included and excluded tags without allowing conflicting selections and clears them on scope changes', async () => {
  const user = userEvent.setup()
  localStorage.setItem('bookmarks:starred:v1', JSON.stringify(['alpha', 'example', 'first', 'later']))
  window.location.hash = '#/starred'
  render(<App data={data} />)
  const list = screen.getByRole('list', { name: 'Starred bookmarks' })
  await user.click(screen.getByText('Filter by tags'))
  await user.click(screen.getByRole('button', { name: '#daily' }))
  await user.click(screen.getByRole('button', { name: 'Exclude tags' }))
  await user.click(screen.getByRole('button', { name: '#analysis' }))
  expect(within(list).getByRole('link')).toHaveAttribute('href', 'https://alpha.example/news')
  expect(screen.getByText('1 included · 1 excluded')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: '#daily' }))
  expect(list.children).toHaveLength(2)
  expect(screen.getByText('0 included · 2 excluded')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Include tags' }))
  await user.click(screen.getByRole('button', { name: 'Excluded: #daily' }))
  expect(within(list).getByRole('link')).toHaveAttribute('href', 'https://alpha.example/news')
  const scopes = screen.getByRole('group', { name: 'Filter starred by collection' })
  await user.click(within(scopes).getByRole('button', { name: 'YouTube' }))
  expect(list.children).toHaveLength(2)
  expect(screen.queryByRole('button', { name: 'Excluded: #analysis' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: '#daily' })).not.toBeInTheDocument()
})


it('removes all stars across collections and filters and keeps them cleared after remounting', async () => {
  const user = userEvent.setup()
  localStorage.setItem('bookmarks:starred:v1', JSON.stringify(['later', 'example', 'first', 'alpha', 'missing-bookmark']))
  window.location.hash = '#/starred'
  const original = JSON.stringify(data)
  const view = render(<App data={data} />)
  const scopes = screen.getByRole('group', { name: 'Filter starred by collection' })
  await user.click(within(scopes).getByRole('button', { name: 'YouTube' }))
  await user.type(screen.getByRole('searchbox'), 'no matches')
  const clear = screen.getByRole('button', { name: 'Remove all stars' })
  expect(clear).toBeEnabled()
  await user.click(clear)
  expect(localStorage.getItem('bookmarks:starred:v1')).toBe('[]')
  expect(clear).toBeDisabled()
  await user.clear(screen.getByRole('searchbox'))
  await user.click(within(scopes).getByRole('button', { name: 'All' }))
  expect(screen.getByText('No starred bookmarks yet.')).toBeInTheDocument()
  view.unmount()
  render(<App data={data} />)
  expect(screen.getByText('No starred bookmarks yet.')).toBeInTheDocument()
  navigate('#/youtube')
  expect(screen.getByRole('list', { name: 'YouTube bookmarks' }).children).toHaveLength(2)
  expect(screen.getByRole('button', { name: 'Star First channel' })).toHaveAttribute('aria-pressed', 'false')
  expect(JSON.stringify(data)).toBe(original)
})


it('excludes YouTube tags with search, resolves conflicting selections, and keeps collection filters independent', async () => {
  const user = userEvent.setup()
  localStorage.setItem('bookmarks:starred:v1', JSON.stringify(['first', 'later']))
  window.location.hash = '#/youtube'
  const original = JSON.stringify(data)
  render(<App data={data} />)
  await user.click(screen.getByText('Filter by tags'))
  await user.click(screen.getByRole('button', { name: 'Exclude tags' }))
  await user.click(screen.getByRole('button', { name: '#science' }))
  expect(screen.getByRole('list').children).toHaveLength(1)
  expect(within(screen.getByRole('list')).getByRole('link')).toHaveAttribute('href', 'https://www.youtube.com/@later')
  expect(screen.getByText('0 included · 1 excluded')).toBeInTheDocument()
  await user.type(screen.getByRole('searchbox'), 'First')
  expect(screen.getByRole('list').children).toHaveLength(0)
  await user.clear(screen.getByRole('searchbox'))
  navigate('#/starred')
  expect(screen.getByRole('list').children).toHaveLength(2)
  expect(screen.getByRole('button', { name: 'Include tags' })).toHaveAttribute('aria-pressed', 'true')
  await user.click(screen.getByRole('button', { name: '#science' }))
  expect(screen.getByRole('list').children).toHaveLength(1)
  navigate('#/youtube')
  expect(screen.getByRole('button', { name: 'Exclude tags' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('button', { name: 'Excluded: #science' })).toHaveAttribute('aria-pressed', 'true')
  await user.click(screen.getByRole('button', { name: 'Include tags' }))
  await user.click(screen.getByRole('button', { name: 'Excluded: #science' }))
  expect(within(screen.getByRole('list')).getByRole('link')).toHaveAttribute('href', 'https://www.youtube.com/@first')
  expect(screen.queryByRole('button', { name: 'Excluded: #science' })).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Exclude tags' }))
  await user.click(screen.getByRole('button', { name: '#science' }))
  expect(within(screen.getByRole('list')).getByRole('link')).toHaveAttribute('href', 'https://www.youtube.com/@later')
  await user.click(within(screen.getByText('Filter by tags').closest('details')!).getByRole('button', { name: 'All' }))
  expect(screen.getByRole('list').children).toHaveLength(2)
  expect(screen.queryByRole('button', { name: 'Excluded: #science' })).not.toBeInTheDocument()
  navigate('#/')
  expect(screen.queryByRole('group', { name: 'Tag filter mode' })).not.toBeInTheDocument()
  expect(JSON.stringify(data)).toBe(original)
})
