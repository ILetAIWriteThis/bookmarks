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
  expect(screen.getByRole('heading', { name: 'Daily' })).toBeInTheDocument()
  expect(screen.queryByRole('link', { name: /Alpha News/ })).not.toBeInTheDocument()
  await user.type(screen.getByRole('searchbox'), 'alpha')
  expect(screen.getByText('0 found')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Clear search' }))
  navigate('#/old/category/news')
  expect(screen.queryByRole('link', { name: /Alpha News/ })).not.toBeInTheDocument()
  navigate('#/old/category/science')
  expect(screen.getByRole('link', { name: /Outside Top/ })).toBeInTheDocument()
})

it('keeps collection filters separate and supports direct YouTube routes', async () => {
  const user = userEvent.setup()
  window.location.hash = '#/youtube'
  render(<App data={data} />)
  expect(screen.getByRole('list', { name: 'YouTube bookmarks' }).children).toHaveLength(2)
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
  await user.click(screen.getByRole('button', { name: '#exclusive' }))
  await user.click(screen.getByRole('button', { name: '#analysis' }))
  expect(screen.getByText('No bookmarks match these tags.')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'All' }))
  expect(screen.getByRole('list').children).toHaveLength(2)
})

it('opens Media and Travel as searchable collections with tag filters', async () => {
  const user = userEvent.setup()
  const expanded: BookmarkData = {
    ...data,
    bookmarks: [...data.bookmarks,
      { id: 'film', title: 'Sample Film', url: 'https://www.imdb.com/title/tt1234567/',
        tags: ['movie', 'genre:action'], placement: { collection: 'media', position: 0 }, categories: [] },
      { id: 'book', title: 'Sample Book', url: 'https://www.goodreads.com/book/show/12345',
        tags: ['book', 'series:sample'], placement: { collection: 'media', position: 1 }, categories: [] },
      { id: 'place', title: 'Pūčkorių piliakalnis', url: 'https://maps.app.goo.gl/ZkdmJcYNHzzY6LqZ6',
        tags: ['europe', 'lithuania', 'nature'], placement: { collection: 'travel', position: 0 }, categories: [] },
    ],
  }
  window.location.hash = '#/media'
  render(<App data={expanded} />)
  const media = screen.getByRole('list', { name: 'Media bookmarks' })
  expect(within(media).getAllByRole('link')).toHaveLength(2)
  await user.click(screen.getByRole('button', { name: '#book' }))
  expect(within(media).getAllByRole('link')).toHaveLength(1)
  expect(within(media).getByRole('link')).toHaveAttribute('href', 'https://www.goodreads.com/book/show/12345')
  navigate('#/travel')
  const travel = screen.getByRole('list', { name: 'Travel bookmarks' })
  await user.type(screen.getByRole('searchbox', { name: 'Search Travel bookmarks' }), 'Puckoriu')
  expect(within(travel).getByRole('link')).toHaveAttribute('href', 'https://maps.app.goo.gl/ZkdmJcYNHzzY6LqZ6')
  await user.click(screen.getByRole('button', { name: '#nature' }))
  expect(within(travel).getAllByRole('link')).toHaveLength(1)
})
