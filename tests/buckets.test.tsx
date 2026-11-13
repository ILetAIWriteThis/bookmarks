import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { BucketBoard } from '../src/components/BucketBoard'
import { AppHeader } from '../src/components/AppHeader'
import { V2Page } from '../src/pages/V2Page'

const entries = ['Alpha', 'Beta'].map((title, i) => ({ bookmark: { id: title, title, url: `https://youtube.com/@${title}`, categories: [] }, position: i + 1, tags: ['listening'] }))
afterEach(() => { cleanup(); vi.restoreAllMocks() })

it('searches across names, descriptions, URLs and tags and adds to the chosen slot', () => {
  const library = [{ ...entries[0], bookmark: { ...entries[0].bookmark, title: 'Álpha', description: 'Stories about ancient worlds' }, tags: ['history'] }, entries[1]]
  render(<BucketBoard scope="youtube-listen" entries={library} />)
  fireEvent.click(screen.getByRole('button', { name: 'Place selected channel in Recurring slot 3' }))
  const search = screen.getByRole('searchbox', { name: 'Search library for Recurring' })
  expect(search).toHaveFocus()
  fireEvent.change(search, { target: { value: 'ALPHA ancient #history @Alpha' } })
  const results = screen.getByRole('list', { name: 'Library results for Recurring' })
  expect(within(results).getAllByRole('listitem')).toHaveLength(1)
  fireEvent.click(within(results).getByRole('button', { name: 'Add Álpha to Recurring' }))
  expect(screen.getByRole('button', { name: 'Added Álpha to Recurring' })).toBeDisabled()
  expect(JSON.parse(localStorage.getItem('bookmarks:buckets:v1:youtube-listen')!)[0].slots).toEqual([null, null, 'Alpha', null, null])
  fireEvent.change(search, { target: { value: 'nothing matches' } })
  expect(screen.getByText('No channels found. Try another name, topic, or tag.')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Clear search for Recurring' }))
  expect(search).toHaveValue('')
  expect(search).toHaveFocus()
})

it('moves search results directly between buckets and prevents overfilling', () => {
  localStorage.setItem('bookmarks:buckets:v1:youtube-listen', JSON.stringify([
    { id: 'one', name: 'Recurring', slots: ['Alpha'] },
    { id: 'two', name: 'Good Stories', slots: [null] },
  ]))
  render(<BucketBoard scope="youtube-listen" entries={entries} />)
  fireEvent.change(screen.getByRole('searchbox', { name: 'Search library for Recurring' }), { target: { value: 'Beta' } })
  expect(screen.getByRole('button', { name: 'Add Beta to Recurring' })).toBeDisabled()
  fireEvent.change(screen.getByRole('searchbox', { name: 'Search library for Good Stories' }), { target: { value: 'Alpha' } })
  fireEvent.click(screen.getByRole('button', { name: 'Move Alpha to Good Stories' }))
  expect(screen.queryByRole('button', { name: 'Remove Alpha from Recurring' })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Remove Alpha from Good Stories' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Add Beta to Recurring' })).toBeEnabled()
  fireEvent.click(screen.getByRole('button', { name: 'Add Beta to Recurring' }))
  expect(screen.getByRole('button', { name: 'Remove Beta from Recurring' })).toBeInTheDocument()
})

it('adds unstarred channels from the full library in both scopes and keeps them after clearing stars', () => {
  const data = { categories: [], bookmarks: entries.map(({ bookmark }, index) => ({
    ...bookmark, tags: index === 0 ? ['listening'] : [], placement: { collection: 'youtube' as const, position: index },
  })) }
  const view = render(<V2Page data={data} collection="starred" />)
  fireEvent.click(screen.getByRole('button', { name: 'YouTube Listen' }))
  fireEvent.change(screen.getByRole('searchbox', { name: 'Search library for Recurring' }), { target: { value: 'Beta' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add Beta to Recurring' }))
  expect(localStorage.getItem('bookmarks:starred:v1')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'YouTube Watch' }))
  fireEvent.change(screen.getByRole('searchbox', { name: 'Search library for Next adventures' }), { target: { value: 'Alpha' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add Alpha to Next adventures' }))
  view.unmount()
  localStorage.setItem('bookmarks:starred:v1', JSON.stringify(['Alpha', 'Beta']))
  render(<V2Page data={data} collection="starred" />)
  fireEvent.click(screen.getByRole('button', { name: 'Remove all stars' }))
  fireEvent.click(screen.getByRole('button', { name: 'YouTube Listen' }))
  expect(screen.getByRole('button', { name: 'Remove Beta from Recurring' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'YouTube Watch' }))
  expect(screen.getByRole('button', { name: 'Remove Alpha from Next adventures' })).toBeInTheDocument()
})
it('places, moves, and persists channels without replacing occupied slots', () => {
  const { unmount } = render(<BucketBoard scope="youtube-listen" entries={entries} />)
  expect(screen.getAllByText('+ Empty slot')).toHaveLength(10)
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
  expect(screen.getAllByText('+ Empty slot')).toHaveLength(9)
  fireEvent.click(move)
  expect(move).toHaveAttribute('aria-pressed', 'true')
  fireEvent.click(move)
  expect(move).toHaveAttribute('aria-pressed', 'false')
  fireEvent.click(move)
  fireEvent.click(screen.getByRole('button', { name: 'Place selected channel in Good Stories slot 2' }))
  expect(screen.getByRole('button', { name: 'Place selected channel in Recurring slot 1' })).toBeInTheDocument()
  const slot = screen.getByRole('link', { name: 'Alpha' }).closest('li')!
  fireEvent.drop(slot, { dataTransfer: { getData: () => 'Beta' } })
  expect(screen.getByRole('status')).toHaveTextContent('occupied')
  unmount()
  render(<BucketBoard scope="youtube-listen" entries={entries} />)
  expect(screen.getByRole('button', { name: 'Remove Alpha from Good Stories' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Remove Alpha from Good Stories' }))
  fireEvent.change(screen.getByRole('searchbox', { name: 'Search library for Good Stories' }), { target: { value: 'Alpha' } })
  expect(screen.getByRole('button', { name: 'Add Alpha to Good Stories' })).toBeEnabled()
})
it('creates custom buckets and keeps Listen separate from Watch', () => {
  const { unmount } = render(<BucketBoard scope="youtube-listen" entries={entries} />)
  fireEvent.change(screen.getByLabelText('New bucket'), { target: { value: 'Campfire tales' } })
  fireEvent.change(screen.getByLabelText('Slots'), { target: { value: '3' } })
  fireEvent.click(screen.getByRole('button', { name: '+ Create bucket' }))
  expect(screen.getByLabelText('Rename Campfire tales bucket')).toBeInTheDocument()
  expect(screen.getAllByText('+ Empty slot')).toHaveLength(13)
  unmount()
  render(<BucketBoard scope="youtube-watch" entries={entries} />)
  expect(screen.queryByLabelText('Rename Campfire tales bucket')).not.toBeInTheDocument()
})
it('recovers from malformed storage and supports drag and drop', () => {
  localStorage.setItem('bookmarks:buckets:v1:youtube-listen', '{broken')
  render(<BucketBoard scope="youtube-listen" entries={entries} />)
  const target = screen.getByRole('button', { name: 'Place selected channel in Recurring slot 1' }).closest('li')!
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
it('persists the dark mode toggle', () => {
  render(<AppHeader />)
  fireEvent.click(screen.getByRole('button', { name: 'Dark mode' }))
  expect(document.documentElement.dataset.theme).toBe('dark')
  expect(localStorage.getItem('bookmarks:theme')).toBe('dark')
})

it('opens only the bucket channels and retries only blocked tabs', () => {
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
  render(<BucketBoard scope="youtube-listen" entries={entries} />)
  expect(screen.getByRole('button', { name: 'Open all in Stories' })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: 'Open all in Recurring' }))
  expect(open).toHaveBeenCalledTimes(2)
  expect(links).toEqual(['https://youtube.com/@Beta'])
  fireEvent.click(screen.getByRole('button', { name: 'Open remaining in Recurring' }))
  expect(links).toEqual(['https://youtube.com/@Beta', 'https://youtube.com/@Alpha'])
  fireEvent.click(screen.getByRole('button', { name: 'Open all in Recurring' }))
  expect(links).toEqual(['https://youtube.com/@Beta', 'https://youtube.com/@Alpha', 'https://youtube.com/@Beta', 'https://youtube.com/@Alpha'])
})
