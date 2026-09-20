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
  bookmarks: [...testData.bookmarks,
    { id: 'later', title: 'Later channel', url: 'https://www.youtube.com/@later',
      categories: [{ categoryId: 'youtube-top', position: 8 }] },
    { id: 'first', title: 'First channel', url: 'https://www.youtube.com/@first', subscribed: false,
      tags: ['SCIENCE', 'science'], categories: [{ categoryId: 'youtube-top', position: 0 }, { categoryId: 'science', position: 1 }] },
    { id: 'outside', title: 'Outside Top', url: 'https://www.youtube.com/@outside',
      categories: [{ categoryId: 'science', position: -1 }] },
  ],
}

function navigate(hash: string) {
  window.location.hash = hash
  fireEvent(window, new HashChangeEvent('hashchange'))
}

it('projects the seed collections without mutating data and prioritizes position over subscription', () => {
  const original = JSON.stringify(data)
  expect(v2Bookmarks(data, 'web').map((entry) => entry.bookmark.id)).toEqual(['alpha', 'example'])
  const youtube = v2Bookmarks(data, 'youtube')
  expect(youtube.map((entry) => entry.position)).toEqual([0, 8])
  expect(youtube[0].tags).toEqual(['science', 'top', 'youtube'])
  expect(JSON.stringify(data)).toBe(original)
})

it('links V2 from the original homepage and filters without changing saved positions', async () => {
  const user = userEvent.setup()
  render(<App data={data} />)
  expect(screen.getByRole('link', { name: 'Try Bookmarks V2' })).toHaveAttribute('href', '#/v2')
  navigate('#/v2')
  const list = screen.getByRole('list', { name: 'Web bookmarks' })
  expect(within(list).getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
    'https://alpha.example/news', 'https://example.com/journal',
  ])
  await user.click(screen.getByRole('button', { name: '#daily' }))
  await user.click(screen.getByRole('button', { name: '#analysis' }))
  expect(within(list).getAllByRole('link')).toHaveLength(1)
  expect(within(list).getByLabelText('Position 2')).toBeInTheDocument()
  expect(screen.getByRole('status')).toHaveTextContent('1 of 2')
  expect(within(list).getByRole('link')).toHaveAttribute('rel', 'noopener noreferrer')
  await user.click(screen.getByRole('button', { name: 'All' }))
  expect(within(list).getAllByRole('link')).toHaveLength(2)
  navigate('#/')
  expect(screen.getByRole('heading', { name: 'Daily' })).toBeInTheDocument()
})

it('keeps collection filters separate and supports direct YouTube routes', async () => {
  const user = userEvent.setup()
  window.location.hash = '#/v2/youtube'
  render(<App data={data} />)
  expect(screen.getByRole('list', { name: 'YouTube bookmarks' }).children).toHaveLength(2)
  await user.click(screen.getByRole('button', { name: '#science' }))
  expect(screen.getByRole('list').children).toHaveLength(1)
  navigate('#/v2/web')
  expect(screen.getByRole('list').children).toHaveLength(2)
  await user.click(screen.getByRole('button', { name: '#analysis' }))
  navigate('#/v2/youtube')
  expect(screen.getByRole('button', { name: '#science' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('list').children).toHaveLength(1)
})

it('explains empty seed collections and nonmatching filter combinations', async () => {
  const user = userEvent.setup()
  window.location.hash = '#/v2'
  const { unmount } = render(<App data={{ ...data, bookmarks: [] }} />)
  expect(screen.getByText('No bookmarks here yet.')).toBeInTheDocument()
  unmount()
  render(<App data={{ ...data, bookmarks: data.bookmarks.map((bookmark) => bookmark.id === 'alpha' ? { ...bookmark, tags: ['exclusive'] } : bookmark) }} />)
  await user.click(screen.getByRole('button', { name: '#exclusive' }))
  await user.click(screen.getByRole('button', { name: '#analysis' }))
  expect(screen.getByText('No bookmarks match these tags.')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'All' }))
  expect(screen.getByRole('list').children).toHaveLength(2)
})
