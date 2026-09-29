import { normalizeSearch } from './data'
import type { BookmarkData, Category } from './types'

const categoryTag = (name: string) => normalizeSearch(name)
  .replace(/['’]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '')

export function migrateOldBookmarks(data: BookmarkData) {
  const categories = new Map(data.categories.map((category) => [category.id, category]))
  const nextPosition = { web: 0, youtube: 0 }
  for (const bookmark of data.bookmarks) {
    if (bookmark.placement?.collection === 'web' || bookmark.placement?.collection === 'youtube') {
      const collection = bookmark.placement.collection
      nextPosition[collection] = Math.max(nextPosition[collection], bookmark.placement.position + 1)
    }
  }

  const migrated = { web: 0, youtube: 0 }
  for (const bookmark of data.bookmarks) {
    if (bookmark.placement) continue
    const categoryIds = new Set<string>()
    for (const membership of bookmark.categories) {
      let category: Category | undefined = categories.get(membership.categoryId)
      while (category) {
        categoryIds.add(category.id)
        category = category.parentId ? categories.get(category.parentId) : undefined
      }
    }
    const collection = categoryIds.has('youtube') ? 'youtube' : 'web'
    const tags = new Set(bookmark.tags ?? [])
    for (const category of data.categories) {
      if (!categoryIds.has(category.id)) continue
      const tag = categoryTag(category.name)
      if (tag) tags.add(tag)
    }
    bookmark.tags = [...tags]
    bookmark.placement = { collection, position: nextPosition[collection]++ }
    migrated[collection]++
  }
  return migrated
}
