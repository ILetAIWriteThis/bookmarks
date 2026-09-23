import { validateBookmarkData } from '../src/data'
import { placeBookmark, removePlacement } from '../src/placement'
import type { Bookmark, BookmarkData } from '../src/types'

const bookmark = (id: string, position?: number): Bookmark => ({
  id, title: id, url: `https://${id}.example`, categories: [],
  placement: position === undefined ? undefined : { collection: 'web', position },
})

it('inserts new and promoted bookmarks without duplicate collection positions', () => {
  const data: BookmarkData = { categories: [], bookmarks: [bookmark('ten', 10), bookmark('eleven', 11), bookmark('twelve', 12)] }
  const added = bookmark('added')
  placeBookmark(data, added, 'web', 11)
  data.bookmarks.push(added)
  expect(data.bookmarks.map(({ placement }) => placement?.position)).toEqual([10, 12, 13, 11])

  const promoted = bookmark('promoted')
  data.bookmarks.push(promoted)
  placeBookmark(data, promoted, 'web', 11)
  expect(data.bookmarks.map(({ placement }) => placement?.position)).toEqual([10, 13, 14, 12, 11])
  expect(() => validateBookmarkData(data)).not.toThrow()

  removePlacement(data, promoted)
  expect(data.bookmarks.map(({ placement }) => placement?.position)).toEqual([10, 12, 13, 11, undefined])
  expect(() => validateBookmarkData(data)).not.toThrow()
})

it('moves a reviewed bookmark within its collection and between collections', () => {
  const data: BookmarkData = { categories: [], bookmarks: [bookmark('first', 1), bookmark('second', 2), bookmark('third', 3)] }
  placeBookmark(data, data.bookmarks[0], 'web', 3)
  expect(data.bookmarks.map(({ placement }) => placement?.position)).toEqual([3, 1, 2])
  placeBookmark(data, data.bookmarks[0], 'youtube', 1)
  expect(data.bookmarks.map(({ placement }) => placement)).toEqual([
    { collection: 'youtube', position: 1 },
    { collection: 'web', position: 1 },
    { collection: 'web', position: 2 },
  ])
  expect(() => validateBookmarkData(data)).not.toThrow()
})
