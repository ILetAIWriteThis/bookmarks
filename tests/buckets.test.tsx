import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { BucketBoard } from '../src/components/BucketBoard'
import { AppHeader } from '../src/components/AppHeader'

const makeEntries = (titles: string[]) => titles.map((title, i) => ({
  bookmark: { id: title, title, url: `https://youtube.com/@${title}`, categories: [] },
  position: i + 1,
  tags: ['listening'],
}))
const entries = makeEntries(['Alpha', 'Beta'])
const savedKey = 'bookmarks:buckets:v3:youtube'
afterEach(() => { cleanup(); vi.restoreAllMocks() })

it.each(['youtube', 'web'] as const)('has three buckets with seven slots on the %s board', collection => {
  render(<BucketBoard collection={collection} entries={entries} />)
  const buckets = screen.getAllByRole('article')
  expect(buckets).toHaveLength(3)
  for (const bucket of buckets) expect(within(bucket).getAllByText('+ Empty slot')).toHaveLength(7)
  expect(screen.queryByText('Buckets settings')).not.toBeInTheDocument()
  expect(screen.queryByText('+ Create group')).not.toBeInTheDocument()
  expect(screen.queryByText('+ Create bucket')).not.toBeInTheDocument()
  expect(screen.queryByText('+ Slot')).not.toBeInTheDocument()
})

it('keeps existing positions, fills gaps with unique overflow, and retains the original layout', () => {
  const library = makeEntries(['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon'])
  const legacyKey = 'bookmarks:buckets:v2:youtube'
  const legacy = JSON.stringify([
    { id: 'first', name: 'First', buckets: [
      { id: 'one', name: 'Recurring', slots: [null, 'Alpha', null, null, null, null, 'Unavailable', 'Beta'] },
      { id: 'two', name: 'Good Stories', slots: [null, 'Gamma'] },
    ] },
    { id: 'second', name: 'Second', buckets: [
      { id: 'three', name: 'Favorites', slots: ['Delta'] },
      { id: 'four', name: 'Overflow', slots: ['Alpha', 'Epsilon'] },
    ] },
  ])
  localStorage.setItem(legacyKey, legacy)
  const { unmount } = render(<BucketBoard collection="youtube" entries={library} />)
  const buckets = screen.getAllByRole('article')
  expect(buckets).toHaveLength(3)
  const recurring = within(buckets[0]).getAllByRole('listitem')
  expect(within(recurring[0]).getByRole('link', { name: 'Beta' })).toBeInTheDocument()
  expect(within(recurring[1]).getByRole('link', { name: 'Alpha' })).toBeInTheDocument()
  expect(within(recurring[2]).getByRole('link', { name: 'Epsilon' })).toBeInTheDocument()
  expect(within(buckets[1]).getByRole('link', { name: 'Gamma' })).toBeInTheDocument()
  expect(within(buckets[2]).getByRole('link', { name: 'Delta' })).toBeInTheDocument()
  expect(screen.getAllByRole('link', { name: 'Alpha' })).toHaveLength(1)
  fireEvent.click(screen.getByRole('button', { name: 'Remove Epsilon from Recurring' }))
  unmount()

  render(<BucketBoard collection="youtube" entries={library} />)
  expect(screen.queryByRole('link', { name: 'Epsilon' })).not.toBeInTheDocument()
  expect(localStorage.getItem(legacyKey)).toBe(legacy)
})

it('reads split Listen and Watch storage and responds to changes from another tab', () => {
  localStorage.setItem('bookmarks:buckets:v1:youtube-listen', JSON.stringify([
    { id: 'one', name: 'Listen', slots: ['Alpha'] },
  ]))
  localStorage.setItem('bookmarks:buckets:v2:youtube-watch', JSON.stringify([
    { id: 'group', name: 'My buckets', buckets: [{ id: 'one', name: 'Watch', slots: [null, 'Beta'] }] },
  ]))
  render(<BucketBoard collection="youtube" entries={entries} />)
  expect(within(screen.getByRole('article', { name: 'Listen' })).getByRole('link', { name: 'Alpha' })).toBeInTheDocument()
  expect(within(screen.getByRole('article', { name: 'Watch' })).getByRole('link', { name: 'Beta' })).toBeInTheDocument()

  localStorage.setItem(savedKey, JSON.stringify([
    { name: 'Recurring', slots: Array(7).fill(null) },
    { name: 'Good Stories', slots: Array(7).fill(null) },
    { name: 'Bucket 3', slots: ['Alpha', ...Array(6).fill(null)] },
  ]))
  fireEvent(window, new StorageEvent('storage', { key: savedKey }))
  expect(screen.queryByRole('link', { name: 'Beta' })).not.toBeInTheDocument()
  expect(within(screen.getByRole('article', { name: 'Bucket 3' })).getByRole('link', { name: 'Alpha' })).toBeInTheDocument()
})

it('searches across names, descriptions, URLs and tags and adds to the chosen slot', () => {
  const library = [{ ...entries[0], bookmark: { ...entries[0].bookmark, title: 'Álpha', description: 'Stories about ancient worlds' }, tags: ['history'] }, entries[1]]
  render(<BucketBoard collection="youtube" entries={library} />)
  fireEvent.click(screen.getByRole('button', { name: 'Fill Recurring slot 3' }))
  const search = screen.getByRole('searchbox', { name: 'Search library for Recurring' })
  expect(search).toHaveFocus()
  fireEvent.change(search, { target: { value: 'ALPHA ancient #history @Alpha' } })
  const results = screen.getByRole('list', { name: 'Library results for Recurring' })
  expect(within(results).getAllByRole('listitem')).toHaveLength(1)
  fireEvent.click(within(results).getByRole('button', { name: 'Add Álpha to Recurring' }))
  expect(screen.getByRole('button', { name: 'Added Álpha to Recurring' })).toBeDisabled()
  expect(JSON.parse(localStorage.getItem(savedKey)!)[0].slots).toEqual([null, null, 'Alpha', null, null, null, null])
  fireEvent.change(search, { target: { value: 'nothing matches' } })
  expect(screen.getByText('No channels found. Try another name, topic, or tag.')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Clear search for Recurring' }))
  expect(search).toHaveValue('')
  expect(search).toHaveFocus()
})

it('moves search results directly between buckets and prevents overfilling', () => {
  const full = ['Alpha', ...Array.from({ length: 6 }, (_, i) => `Channel ${i}`)]
  localStorage.setItem('bookmarks:buckets:v1:youtube-listen', JSON.stringify([
    { id: 'one', name: 'Recurring', slots: full },
    { id: 'two', name: 'Good Stories', slots: [null] },
  ]))
  render(<BucketBoard collection="youtube" entries={makeEntries([...full, 'Beta'])} />)
  fireEvent.change(screen.getByRole('searchbox', { name: 'Search library for Recurring' }), { target: { value: 'Beta' } })
  expect(screen.getByRole('button', { name: 'Add Beta to Recurring' })).toBeDisabled()
  expect(screen.getByText('Bucket full. Remove a channel to make room.')).toBeInTheDocument()
  fireEvent.change(screen.getByRole('searchbox', { name: 'Search library for Good Stories' }), { target: { value: 'Alpha' } })
  fireEvent.click(screen.getByRole('button', { name: 'Move Alpha to Good Stories' }))
  expect(screen.queryByRole('button', { name: 'Remove Alpha from Recurring' })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Remove Alpha from Good Stories' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Add Beta to Recurring' }))
  expect(screen.getByRole('button', { name: 'Remove Beta from Recurring' })).toBeInTheDocument()
})

it('selects, moves, and persists channels without replacing occupied slots', () => {
  const { unmount } = render(<BucketBoard collection="youtube" entries={entries} />)
  fireEvent.change(screen.getByRole('searchbox', { name: 'Search library for Recurring' }), { target: { value: 'Alpha' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add Alpha to Recurring' }))
  const channel = screen.getByRole('link', { name: 'Alpha' })
  expect(channel).toHaveAttribute('href', 'https://youtube.com/@Alpha')
  expect(channel).toHaveAttribute('target', '_blank')
  expect(channel).toHaveAttribute('rel', 'noopener noreferrer')
  expect(channel).toHaveAttribute('draggable', 'false')
  fireEvent.click(channel)
  const move = screen.getByRole('button', { name: 'Move Alpha' })
  expect(move).toHaveAttribute('aria-pressed', 'false')
  fireEvent.click(move)
  expect(move).toHaveAttribute('aria-pressed', 'true')
  fireEvent.click(move)
  expect(move).toHaveAttribute('aria-pressed', 'false')
  fireEvent.click(move)
  fireEvent.click(screen.getByRole('button', { name: 'Place selected channel in Good Stories slot 2' }))
  expect(screen.getByRole('button', { name: 'Fill Recurring slot 1' })).toBeInTheDocument()
  fireEvent.drop(screen.getByRole('link', { name: 'Alpha' }).closest('li')!, { dataTransfer: { getData: () => 'Beta' } })
  expect(screen.getByRole('status')).toHaveTextContent('occupied')
  unmount()

  render(<BucketBoard collection="youtube" entries={entries} />)
  expect(screen.getByRole('button', { name: 'Remove Alpha from Good Stories' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Remove Alpha from Good Stories' }))
  expect(screen.queryByRole('link', { name: 'Alpha' })).not.toBeInTheDocument()
})

it('recovers from malformed storage and supports drag and drop', () => {
  localStorage.setItem(savedKey, '{broken')
  render(<BucketBoard collection="youtube" entries={entries} />)
  const target = screen.getByRole('button', { name: 'Fill Recurring slot 1' }).closest('li')!
  fireEvent.drop(target, { dataTransfer: { getData: () => 'Alpha' } })
  expect(screen.getByRole('button', { name: 'Remove Alpha from Recurring' })).toBeInTheDocument()
  const dataTransfer = { setData: vi.fn(), getData: () => 'Alpha', effectAllowed: '' }
  fireEvent.dragStart(screen.getByRole('button', { name: 'Move Alpha' }), { dataTransfer })
  expect(dataTransfer.setData).toHaveBeenCalledWith('text/plain', 'Alpha')
  expect(dataTransfer.effectAllowed).toBe('move')
  fireEvent.drop(screen.getByRole('button', { name: 'Place selected channel in Good Stories slot 1' }).closest('li')!, { dataTransfer })
  expect(screen.getByRole('button', { name: 'Remove Alpha from Good Stories' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Remove Alpha from Recurring' })).not.toBeInTheDocument()
})

it('swaps occupied slots in a full bucket and saves the new order', () => {
  const original = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta']
  const library = makeEntries(original)
  localStorage.setItem('bookmarks:buckets:v1:youtube-listen', JSON.stringify([
    { name: 'Recurring', slots: original },
  ]))
  const { unmount } = render(<BucketBoard collection="youtube" entries={library} />)
  const dataTransfer = { setData: vi.fn(), getData: () => 'Eta' }
  fireEvent.dragStart(screen.getByRole('button', { name: 'Move Eta' }), { dataTransfer })
  fireEvent.drop(screen.getByRole('link', { name: 'Alpha' }).closest('li')!, { dataTransfer })

  const slots = () => within(screen.getByRole('article', { name: 'Recurring' })).getAllByRole('link')
    .map(link => link.textContent)
  const expected = ['Eta', ...original.slice(1, -1), 'Alpha']
  expect(slots()).toEqual(expected)
  unmount()
  render(<BucketBoard collection="youtube" entries={library} />)
  expect(slots()).toEqual(expected)
})

it('persists the dark mode toggle', () => {
  render(<AppHeader />)
  fireEvent.click(screen.getByRole('button', { name: 'Dark mode' }))
  expect(document.documentElement.dataset.theme).toBe('dark')
  expect(localStorage.getItem('bookmarks:theme')).toBe('dark')
})

it.each([
  { browser: 'Chromium', userAgent: 'Chrome/131.0', first: 'Beta', second: 'Alpha' },
  { browser: 'Firefox', userAgent: 'Firefox/133.0', first: 'Alpha', second: 'Beta' },
])('opens only the bucket channels in $browser and retries only blocked tabs', ({ userAgent, first, second }) => {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(userAgent)
  localStorage.setItem('bookmarks:buckets:v1:youtube-listen', JSON.stringify([
    { id: 'one', name: 'Recurring', slots: ['Beta', null, 'Alpha'] },
    { id: 'two', name: 'Stories', slots: [null] },
  ]))
  const links: string[] = []
  const tab = { opener: window, document: {
    createElement: () => { const link = { href: '', rel: '', referrerPolicy: '', click: () => links.push(link.href) }; return link },
    body: { append: () => undefined },
  } }
  const open = vi.spyOn(window, 'open').mockReturnValueOnce(tab as unknown as Window).mockReturnValueOnce(null).mockReturnValue(tab as unknown as Window)
  render(<BucketBoard collection="youtube" entries={entries} />)
  expect(screen.getByRole('button', { name: 'Open all in Stories' })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: 'Open all in Recurring' }))
  expect(open).toHaveBeenCalledTimes(2)
  expect(links).toEqual([`https://youtube.com/@${first}`])
  fireEvent.click(screen.getByRole('button', { name: 'Open remaining in Recurring' }))
  const expected = [first, second].map(title => `https://youtube.com/@${title}`)
  expect(links).toEqual(expected)
  fireEvent.click(screen.getByRole('button', { name: 'Open all in Recurring' }))
  expect(links).toEqual([...expected, ...expected])
})
