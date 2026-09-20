import { comparePositionAndTitle, normalizeSearch } from './data'
import type { Bookmark, BookmarkData } from './types'

export type V2Collection = 'web' | 'youtube'

export interface V2Bookmark {
  bookmark: Bookmark
  position: number
  tags: string[]
}

const tagName = (value: string) => normalizeSearch(value).replace(/^#+/, '').replace(/\s+/g, '-')

/** A read-only view of the original collection, ordered strictly by saved position. */
export function v2Bookmarks(data: BookmarkData, collection: V2Collection): V2Bookmark[] {
  const categories = new Map(data.categories.map((category) => [category.id, category]))
  return data.bookmarks.flatMap((bookmark) => {
    const position = collection === 'web' ? bookmark.dailyPosition
      : bookmark.categories.find((membership) => membership.categoryId === 'youtube-top')?.position
    if (position === undefined) return []

    const tags = new Set<string>(collection === 'web' ? ['daily'] : [])
    for (const tag of bookmark.tags ?? []) {
      const normalized = tagName(tag)
      if (normalized) tags.add(normalized)
    }
    for (const membership of bookmark.categories) {
      let category = categories.get(membership.categoryId)
      const visited = new Set<string>()
      while (category && !visited.has(category.id)) {
        visited.add(category.id)
        tags.add(tagName(category.name))
        category = category.parentId ? categories.get(category.parentId) : undefined
      }
    }
    return [{ bookmark, position, tags: [...tags] }]
  }).sort((a, b) => comparePositionAndTitle(a.position, a.bookmark.title, b.position, b.bookmark.title))
}
