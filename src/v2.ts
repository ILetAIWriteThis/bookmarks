import { comparePositionAndTitle, normalizeSearch } from './data'
import type { Bookmark, BookmarkData } from './types'

export type V2Collection = 'web' | 'youtube' | 'media' | 'travel'

export interface V2Bookmark {
  bookmark: Bookmark
  position: number
  tags: string[]
}

const tagName = (value: string) => normalizeSearch(value).replace(/^#+/, '').replace(/\s+/g, '-')

/** Reviewed bookmarks in their explicitly chosen collection and order. */
export function v2Bookmarks(data: BookmarkData, collection: V2Collection): V2Bookmark[] {
  return data.bookmarks.flatMap((bookmark) => {
    if (bookmark.placement?.collection !== collection) return []
    const position = bookmark.placement.position

    const tags = new Set<string>()
    for (const tag of bookmark.tags ?? []) {
      const normalized = tagName(tag)
      if (normalized) tags.add(normalized)
    }
    return [{ bookmark, position, tags: [...tags] }]
  }).sort((a, b) => comparePositionAndTitle(a.position, a.bookmark.title, b.position, b.bookmark.title))
}
