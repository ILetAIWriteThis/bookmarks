import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '../src/App'
import { sortMedia, validateMediaData } from '../src/media'
import { testData } from './fixtures'
import mediaData from '../public/data/media.json'

const sample = {
  entries: [
    { id: 'first', kind: 'book', title: 'First Book', creators: ['A. Writer'], published: '2001', addedOn: '2026-09-20', genres: ['Fantasy'], series: { name: 'Sample Saga', position: 1 }, url: 'https://example.com/first' },
    { id: 'second', kind: 'book', title: 'Second Book', creators: ['A. Writer'], published: '2002', addedOn: '2026-09-22', genres: ['Fantasy'], series: { name: 'Sample Saga', position: 2 }, url: 'https://example.com/second' },
    { id: 'other', kind: 'book', title: 'Other Book', creators: ['B. Writer'], published: '2010', addedOn: '2026-09-21', genres: ['Horror'], url: 'https://example.com/other' },
    { id: 'film', kind: 'movie', title: 'Sample Film', creators: ['D. Director'], published: '2012', addedOn: '2026-09-23', genres: ['Action'], universe: 'Sample Universe', url: 'https://example.com/film' },
    { id: 'show', kind: 'tv', title: 'Sample Show', creators: ['D. Director'], published: '2013', addedOn: '2026-09-23', genres: ['Action'], universe: 'Sample Universe', seasons: [{ number: 1 }, { number: 2 }], url: 'https://example.com/show' },
  ],
}

afterEach(() => { vi.unstubAllGlobals(); window.location.hash = '#/' })

it('ships an empty valid library for real entries', () => {
  const data = validateMediaData(mediaData)
  expect(data.entries).toEqual([])
})

it('validates the separate library store and sorts series by position', () => {
  const data = validateMediaData(sample)
  const books = data.entries.filter((entry) => entry.kind === 'book')
  expect(sortMedia(books, 'series').map((entry) => entry.id)).toEqual(['other', 'first', 'second'])
  expect(sortMedia(books, 'series', true).map((entry) => entry.id)).toEqual(['second', 'first', 'other'])
  expect(sortMedia(books, 'published').map((entry) => entry.id)).toEqual(['other', 'second', 'first'])
  expect(sortMedia(books, 'published', true).map((entry) => entry.id)).toEqual(['first', 'second', 'other'])
  expect(() => validateMediaData({ entries: [sample.entries[0], sample.entries[0]] })).toThrow('Duplicate library id')
  expect(() => validateMediaData({ entries: [{ ...sample.entries[0], completedDates: ['2026-02-30'] }] })).toThrow('ISO dates')
  expect(() => validateMediaData({ entries: [{ ...sample.entries[0], completedDates: ['2026-02-01', '2026-02-01'] }] })).toThrow('duplicate date')
  expect(() => validateMediaData({ entries: [{ ...sample.entries[3], language: 'Lithuanian' }] })).toThrow('only for books')
  expect(validateMediaData({ entries: [{ ...sample.entries[0], url: undefined }] }).entries[0].url).toBeUndefined()
  expect(() => validateMediaData({ entries: [{ ...sample.entries[0], url: 'http://example.com/book.pdf' }] })).toThrow('HTTPS URL')
})

it('keeps repeat finish dates on one entry and distinct languages on separate entries', () => {
  const data = validateMediaData({ entries: [
    { ...sample.entries[0], addedOn: '2024-01-01', language: 'English', completedDates: ['2024-01-10', '2026-09-01'] },
    { ...sample.entries[0], id: 'first-lt', addedOn: '2025-05-01', language: 'Lithuanian', completedDates: ['2025-05-12'] },
    { ...sample.entries[4], addedOn: '2024-01-01', seasons: [{ number: 1, completedDates: ['2024-01-01', '2026-09-22'] }] },
  ] })
  expect(data.entries).toHaveLength(3)
  expect(sortMedia(data.entries, 'recent').map((entry) => entry.id)).toEqual(['show', 'first', 'first-lt'])
})

it('opens books first, ranks filter values by frequency, and combines screen media', async () => {
  const user = userEvent.setup()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => sample }))
  window.location.hash = '#/library'
  render(<App data={testData} />)
  const list = await screen.findByRole('list', { name: 'Books list' })
  expect(within(list).getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual(['Second Book', 'Other Book', 'First Book'])
  const genreOptions = screen.getByText('Genre').parentElement!.querySelectorAll('button')
  expect([...genreOptions].map((button) => button.textContent)).toEqual(['All', 'Fantasy', 'Horror'])
  await user.selectOptions(screen.getByLabelText('Sort by'), 'published')
  expect(within(list).getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual(['Other Book', 'Second Book', 'First Book'])
  await user.click(screen.getByRole('button', { name: 'Sort order: Newest first. Reverse order' }))
  expect(within(list).getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual(['First Book', 'Second Book', 'Other Book'])
  await user.click(screen.getByRole('button', { name: /Sample Saga · 1/ }))
  expect(within(list).getAllByRole('heading', { level: 3 })).toHaveLength(2)
  await user.selectOptions(screen.getByLabelText('Sort by'), 'series')
  expect(screen.getByRole('button', { name: 'Sort order: First to last. Reverse order' })).toBeInTheDocument()
  expect(within(list).getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual(['First Book', 'Second Book'])
  expect(screen.getByRole('link', { name: 'Open First Book source in a new tab' })).toHaveAttribute('rel', 'noopener noreferrer')
  await user.click(screen.getByRole('button', { name: 'More filters' }))
  expect([...screen.getByLabelText('Author').querySelectorAll('option')].map((option) => option.textContent)).toEqual(['All', 'A. Writer', 'B. Writer'])
  fireEvent.click(screen.getByRole('link', { name: 'Screen' }))
  await waitFor(() => expect(screen.getByRole('list', { name: 'Screen list' })).toBeInTheDocument())
  expect(screen.getByRole('heading', { name: 'Sample Film' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Sample Show' })).toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: 'First Book' })).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Movies' }))
  expect(screen.queryByRole('heading', { name: 'Sample Show' })).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'TV series' }))
  expect(screen.queryByRole('heading', { name: 'Sample Film' })).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Clear filters ×' }))
  await user.click(screen.getByRole('button', { name: 'Sample Universe' }))
  expect(screen.getByRole('heading', { name: 'Sample Film' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Sample Show' })).toBeInTheDocument()
  await user.click(screen.getByText('Seasons 1–2'))
  expect(screen.getByText('Season 1')).toBeVisible()
  expect(screen.getByText('Season 2')).toBeVisible()
})

it('opens old TV links with the TV filter selected', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => sample }))
  window.location.hash = '#/library/tv'
  render(<App data={testData} />)
  expect(await screen.findByRole('list', { name: 'Screen list' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'TV series' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('heading', { name: 'Sample Show' })).toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: 'Sample Film' })).not.toBeInTheDocument()
})

it('filters book editions by language and shows reread dates on one entry', async () => {
  const user = userEvent.setup()
  const entries = [
    { ...sample.entries[0], language: 'English', completedDates: ['2024-01-10', '2026-09-01'] },
    { ...sample.entries[0], id: 'first-lt', title: 'Pirma knyga', language: 'Lithuanian', url: undefined },
  ]
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ entries }) }))
  window.location.hash = '#/library'
  render(<App data={testData} />)
  const list = await screen.findByRole('list', { name: 'Books list' })
  expect(within(list).queryByText('English')).not.toBeInTheDocument()
  await user.click(screen.getByText('Reading dates'))
  expect(screen.getByText('Sep 1, 2026 · Jan 10, 2024')).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'More filters' }))
  await user.selectOptions(screen.getByLabelText('Language'), 'Lithuanian')
  expect(screen.getByRole('heading', { name: 'Pirma knyga' })).toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: 'First Book' })).not.toBeInTheDocument()
  expect(screen.queryByRole('link', { name: 'Open Pirma knyga source in a new tab' })).not.toBeInTheDocument()
})
