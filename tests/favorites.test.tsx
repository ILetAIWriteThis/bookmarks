import { act, fireEvent, render, renderHook, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { useFavorites, starredPeriod } from '../src/favorites'
import { V2Page } from '../src/pages/V2Page'
import type { BookmarkData } from '../src/types'

const idsKey = 'bookmarks:starred:v1'
const datesKey = 'bookmarks:starred-dates:v1'
const start = Date.UTC(2026, 0, 1)
afterEach(() => vi.useRealTimers())

it('dates legacy stars once, preserves order, and persists their deadline across reloads', () => {
  vi.useFakeTimers()
  vi.setSystemTime(start)
  localStorage.setItem(idsKey, '["later","first"]')
  const view = renderHook(useFavorites)
  expect(view.result.current.ids).toEqual(['later', 'first'])
  expect(view.result.current.dates.first).toEqual({ addedAt: start, reviewAt: start + starredPeriod })
  view.unmount()
  vi.setSystemTime(start + starredPeriod)
  const reloaded = renderHook(useFavorites)
  expect(reloaded.result.current.isOverdue('first')).toBe(false)
  act(() => vi.advanceTimersByTime(60_000))
  expect(reloaded.result.current.isOverdue('first')).toBe(true)
  expect(reloaded.result.current.ids).toEqual(['later', 'first'])
})

it('renews from today without changing added date or order and gives re-starred items a fresh date', () => {
  vi.useFakeTimers()
  vi.setSystemTime(start)
  const view = renderHook(useFavorites)
  act(() => view.result.current.toggle('first'))
  act(() => view.result.current.toggle('later'))
  vi.setSystemTime(start + 40 * 86400_000)
  act(() => fireEvent(window, new Event('focus')))
  expect(view.result.current.isOverdue('first')).toBe(true)
  act(() => view.result.current.prolong('first'))
  expect(view.result.current.ids).toEqual(['first', 'later'])
  expect(view.result.current.dates.first).toEqual({ addedAt: start, reviewAt: Date.now() + starredPeriod })
  expect(view.result.current.isOverdue('first')).toBe(false)
  expect(view.result.current.isOverdue('later')).toBe(true)
  view.unmount()
  const reloaded = renderHook(useFavorites)
  expect(reloaded.result.current.isOverdue('first')).toBe(false)
  act(() => reloaded.result.current.remove('first'))
  act(() => reloaded.result.current.toggle('first'))
  expect(reloaded.result.current.ids).toEqual(['later', 'first'])
  expect(reloaded.result.current.dates.first.addedAt).toBe(Date.now())
  act(() => reloaded.result.current.clear())
  expect(JSON.parse(localStorage.getItem(datesKey)!)).toEqual({})
})

it('syncs dates and removed stars from other tabs and repairs invalid date metadata', () => {
  vi.useFakeTimers()
  vi.setSystemTime(start)
  localStorage.setItem(idsKey, '["first"]')
  localStorage.setItem(datesKey, '{"first":{"addedAt":"invalid"}}')
  const view = renderHook(useFavorites)
  expect(view.result.current.isOverdue('first')).toBe(false)
  localStorage.setItem(datesKey, JSON.stringify({ first: { addedAt: 0, reviewAt: 1 } }))
  act(() => fireEvent(window, new StorageEvent('storage', { key: datesKey })))
  expect(view.result.current.isOverdue('first')).toBe(true)
  localStorage.clear()
  act(() => fireEvent(window, new StorageEvent('storage', { key: null })))
  expect(view.result.current.ids).toEqual([])
})

it('shows review controls only for overdue channels in Starred, renews them, and removes only the star', () => {
  vi.useFakeTimers()
  vi.setSystemTime(start)
  const data: BookmarkData = { categories: [], bookmarks: [
    { id: 'first', title: 'First channel', url: 'https://youtube.com/@first', placement: { collection: 'youtube', position: 1 }, categories: [] },
    { id: 'later', title: 'Later channel', url: 'https://youtube.com/@later', placement: { collection: 'youtube', position: 2 }, categories: [] },
    { id: 'web', title: 'Website', url: 'https://example.com', placement: { collection: 'web', position: 1 }, categories: [] },
  ] }
  localStorage.setItem(idsKey, '["first","later","web"]')
  localStorage.setItem(datesKey, JSON.stringify(Object.fromEntries(['first', 'later', 'web'].map((id) => [id, { addedAt: 0, reviewAt: 1 }]))))
  const view = render(<V2Page data={data} collection="youtube" />)
  expect(screen.queryByText(/Older than 30d/)).not.toBeInTheDocument()
  view.rerender(<V2Page data={data} collection="starred" />)
  expect(screen.getAllByText(/Older than 30d/)).toHaveLength(2)
  fireEvent.click(within(screen.getByRole('group', { name: 'Review First channel' })).getByRole('button', { name: 'Prolong for 30d' }))
  expect(screen.queryByRole('group', { name: 'Review First channel' })).not.toBeInTheDocument()
  fireEvent.click(within(screen.getByRole('group', { name: 'Review Later channel' })).getByRole('button', { name: 'Remove' }))
  expect(screen.queryByRole('link', { name: /Later channel/ })).not.toBeInTheDocument()
  expect(JSON.parse(localStorage.getItem(idsKey)!)).toEqual(['first', 'web'])
  view.rerender(<V2Page data={data} collection="youtube" />)
  expect(screen.getByRole('link', { name: /Later channel/ })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Star Later channel' })).toBeInTheDocument()
})
