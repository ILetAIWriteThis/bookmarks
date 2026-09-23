import type { Bookmark, BookmarkData, BookmarkPlacement } from './types'

export function placeBookmark(data: BookmarkData, bookmark: Bookmark, collection: BookmarkPlacement['collection'], position: number) {
  const previous = bookmark.placement
  if (previous?.collection === collection && previous.position === position) return
  if (previous) {
    data.bookmarks.forEach((item) => {
      if (item.id !== bookmark.id && item.placement?.collection === previous.collection
        && item.placement.position > previous.position) item.placement.position -= 1
    })
  }
  data.bookmarks.forEach((item) => {
    if (item.id !== bookmark.id && item.placement?.collection === collection
      && item.placement.position >= position) item.placement.position += 1
  })
  bookmark.placement = { collection, position }
}

export function removePlacement(data: BookmarkData, bookmark: Bookmark) {
  const previous = bookmark.placement
  if (!previous) return
  delete bookmark.placement
  data.bookmarks.forEach((item) => {
    if (item.placement?.collection === previous.collection && item.placement.position > previous.position) {
      item.placement.position -= 1
    }
  })
}
