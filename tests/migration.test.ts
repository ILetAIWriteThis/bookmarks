import bookmarkData from '../public/data/bookmarks.json'
import { validateBookmarkData } from '../src/data'

it('removes Media and Travel categories and their bookmarks', () => {
  const data = validateBookmarkData(bookmarkData)
  expect(data.categories.some(({ id }) => id === 'media' || id === 'travel' || id.startsWith('travel-'))).toBe(false)
  expect(data.bookmarks.some((bookmark) => bookmark.placement?.collection === 'media' || bookmark.placement?.collection === 'travel')).toBe(false)
  expect(data.bookmarks.some((bookmark) => bookmark.categories.some(({ categoryId }) => categoryId === 'media' || categoryId === 'travel' || categoryId.startsWith('travel-')))).toBe(false)
  expect(data.bookmarks.filter((bookmark) => !bookmark.placement)).toHaveLength(0)
  expect(data.bookmarks.some(({ id }) => id === 'cave-of-zeus' || id === 'puckoriu-piliakalnis' || id === 'the-avengers-2012')).toBe(false)
})

it('preserves Web and YouTube placements and reviewed topic tags', () => {
  const data = validateBookmarkData(bookmarkData)
  expect(data.bookmarks.find((bookmark) => bookmark.id === 'youtube-baltic-defence-review')).toMatchObject({
    tags: ['politics', 'military', 'geopolitics'],
    placement: { collection: 'youtube' },
  })
  expect(data.categories.some(({ id }) => id === 'youtube-travel')).toBe(true)
})
