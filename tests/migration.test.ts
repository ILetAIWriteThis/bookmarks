import bookmarkData from '../public/data/bookmarks.json'
import { validateBookmarkData } from '../src/data'

it('keeps migrated media and travel in the reviewed bookmark store', () => {
  const data = validateBookmarkData(bookmarkData)
  const media = data.bookmarks.filter((bookmark) => bookmark.placement?.collection === 'media')
  const travel = data.bookmarks.filter((bookmark) => bookmark.placement?.collection === 'travel')

  expect(media).toHaveLength(1260)
  expect(media.filter((bookmark) => bookmark.tags?.includes('book'))).toHaveLength(269)
  expect(media.filter((bookmark) => bookmark.tags?.includes('tv-series'))).toHaveLength(72)
  expect(media.filter((bookmark) => bookmark.tags?.includes('movie'))).toHaveLength(919)
  expect(media.find((bookmark) => bookmark.id === 'the-avengers-2012')).toMatchObject({
    url: 'https://www.imdb.com/title/tt0848228/',
    tags: expect.arrayContaining(['movie', 'genre:action', 'franchise:mcu']),
  })
  expect(media.find((bookmark) => bookmark.id === 'goodreads-43419431')).toMatchObject({
    url: 'https://www.goodreads.com/book/show/43419431',
    tags: expect.arrayContaining(['book', 'series:dune']),
  })
  expect(media.every((bookmark) => !Object.keys(bookmark).some((key) => /date|published|creator|season|language/i.test(key)))).toBe(true)

  expect(travel).toHaveLength(1)
  expect(data.bookmarks.filter((bookmark) => !bookmark.placement && bookmark.categories.some((membership) => membership.categoryId.startsWith('travel')))).toHaveLength(19)
  expect(travel.find((bookmark) => bookmark.id === 'puckoriu-piliakalnis')).toMatchObject({
    url: 'https://maps.app.goo.gl/ZkdmJcYNHzzY6LqZ6',
    tags: expect.arrayContaining(['europe', 'lithuania', 'nature']),
    categories: [{ categoryId: 'travel-visited-places', position: 1 }],
  })
})
