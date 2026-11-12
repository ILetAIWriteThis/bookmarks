import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { BucketBoard } from '../src/components/BucketBoard'
import { AppHeader } from '../src/components/AppHeader'

const entries = ['Alpha', 'Beta'].map((title, i) => ({ bookmark: { id: title, title, url: `https://youtube.com/@${title}`, categories: [] }, position: i + 1, tags: ['listening'] }))
afterEach(() => { cleanup(); vi.restoreAllMocks() })
it('places, moves, and persists channels without replacing occupied slots', () => {
  const { unmount } = render(<BucketBoard scope="youtube-listen" entries={entries} />)
  expect(screen.getAllByText('+ Empty slot')).toHaveLength(10)
  fireEvent.click(screen.getByRole('button', { name: '⠿ Alpha' }))
  fireEvent.click(screen.getByRole('button', { name: 'Place selected channel in Recurring slot 1' }))
  fireEvent.click(screen.getByRole('button', { name: 'Alpha' }))
  fireEvent.click(screen.getByRole('button', { name: 'Place selected channel in Good Stories slot 2' }))
  expect(screen.getByRole('button', { name: 'Place selected channel in Recurring slot 1' })).toBeInTheDocument()
  const slot = screen.getByRole('button', { name: 'Alpha' }).closest('li')!
  fireEvent.drop(slot, { dataTransfer: { getData: () => 'Beta' } })
  expect(screen.getByRole('status')).toHaveTextContent('occupied')
  unmount()
  render(<BucketBoard scope="youtube-listen" entries={entries} />)
  expect(screen.getByRole('button', { name: 'Remove Alpha from Good Stories' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Remove Alpha from Good Stories' }))
  expect(screen.getByRole('button', { name: '⠿ Alpha' })).toBeInTheDocument()
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
