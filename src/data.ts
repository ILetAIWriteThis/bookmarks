import type { Bookmark, BookmarkData, BookmarkPlacement, Category, CategoryMembership, ThemeColors } from './types'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const requiredString = (value: unknown, path: string, errors: string[]) => {
  if (typeof value !== 'string' || value.trim() === '') {
    errors.push(`${path} must be a non-empty string`)
    return ''
  }
  return value.trim()
}

const requiredPosition = (value: unknown, path: string, errors: string[]) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    errors.push(`${path} must be a finite number`)
    return 0
  }
  return value
}

const optionalString = (value: unknown, path: string, errors: string[]) => {
  if (value === undefined) return undefined
  if (typeof value !== 'string' || value.trim() === '') {
    errors.push(`${path} must be a non-empty string when provided`)
    return undefined
  }
  return value.trim()
}

const isYouTubeChannelUrl = (url: string) => {
  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname.replace(/^www\./, "")
    return (hostname === "youtube.com" || hostname === "m.youtube.com")
      && (/^\/@[^/]+/.test(parsed.pathname) || /^\/channel\/[^/]+/.test(parsed.pathname))
  } catch {
    return false
  }
}

const parseTheme = (value: unknown, path: string, errors: string[]): ThemeColors | undefined => {
  if (value === undefined) return undefined
  if (!isRecord(value)) {
    errors.push(`${path} must be an object`)
    return undefined
  }
  return {
    from: requiredString(value.from, `${path}.from`, errors),
    to: requiredString(value.to, `${path}.to`, errors),
    accent: requiredString(value.accent, `${path}.accent`, errors),
  }
}

const parseCategory = (value: unknown, index: number, errors: string[]): Category | undefined => {
  const path = `categories[${index}]`
  if (!isRecord(value)) {
    errors.push(`${path} must be an object`)
    return undefined
  }
  return {
    id: requiredString(value.id, `${path}.id`, errors),
    name: requiredString(value.name, `${path}.name`, errors),
    position: requiredPosition(value.position, `${path}.position`, errors),
    parentId: optionalString(value.parentId, `${path}.parentId`, errors),
    icon: optionalString(value.icon, `${path}.icon`, errors),
    theme: parseTheme(value.theme, `${path}.theme`, errors),
  }
}

const parseMembership = (
  value: unknown,
  bookmarkIndex: number,
  index: number,
  errors: string[],
): CategoryMembership | undefined => {
  const path = `bookmarks[${bookmarkIndex}].categories[${index}]`
  if (!isRecord(value)) {
    errors.push(`${path} must be an object`)
    return undefined
  }
  return {
    categoryId: requiredString(value.categoryId, `${path}.categoryId`, errors),
    position: requiredPosition(value.position, `${path}.position`, errors),
  }
}

const parsePlacement = (value: unknown, path: string, errors: string[]): BookmarkPlacement | undefined => {
  if (value === undefined) return undefined
  if (!isRecord(value)) {
    errors.push(`${path} must be an object`)
    return undefined
  }
  if (value.collection !== 'web' && value.collection !== 'youtube') {
    errors.push(`${path}.collection must be web or youtube`)
  }
  const position = requiredPosition(value.position, `${path}.position`, errors)
  if (!Number.isSafeInteger(position) || position < 0) errors.push(`${path}.position must be a non-negative safe integer`)
  return {
    collection: value.collection === 'youtube' ? 'youtube' : 'web',
    position,
  }
}

const parseBookmark = (value: unknown, index: number, errors: string[]): Bookmark | undefined => {
  const path = `bookmarks[${index}]`
  if (!isRecord(value)) {
    errors.push(`${path} must be an object`)
    return undefined
  }

  const url = requiredString(value.url, `${path}.url`, errors)
  if (url) {
    try {
      if (new URL(url).protocol !== 'https:') errors.push(`${path}.url must use HTTPS`)
    } catch {
      errors.push(`${path}.url must be a valid URL`)
    }
  }

  let tags: string[] | undefined
  if (value.tags !== undefined) {
    if (!Array.isArray(value.tags)) errors.push(`${path}.tags must be an array`)
    else tags = value.tags.map((tag, tagIndex) => requiredString(tag, `${path}.tags[${tagIndex}]`, errors))
  }

  let dailyPosition: number | undefined
  if (value.dailyPosition !== undefined) {
    dailyPosition = requiredPosition(value.dailyPosition, `${path}.dailyPosition`, errors)
  }

  let subscribed: boolean | undefined
  if (value.subscribed !== undefined) {
    if (typeof value.subscribed !== "boolean") errors.push(path + ".subscribed must be a boolean when provided")
    else if (!isYouTubeChannelUrl(url)) errors.push(path + ".subscribed only applies to YouTube channel URLs")
    else subscribed = value.subscribed
  }

  const memberships = Array.isArray(value.categories)
    ? value.categories
        .map((item, membershipIndex) => parseMembership(item, index, membershipIndex, errors))
        .filter((item): item is CategoryMembership => Boolean(item))
    : []
  if (!Array.isArray(value.categories)) errors.push(`${path}.categories must be an array`)

  return {
    id: requiredString(value.id, `${path}.id`, errors),
    title: requiredString(value.title, `${path}.title`, errors),
    url,
    description: optionalString(value.description, `${path}.description`, errors),
    tags,
    subscribed,
    dailyPosition,
    categories: memberships,
    placement: parsePlacement(value.placement, `${path}.placement`, errors),
  }
}

const reportDuplicates = (values: string[], path: string, errors: string[]) => {
  const seen = new Set<string>()
  values.forEach((value) => {
    if (value && seen.has(value)) errors.push(`duplicate ${path} id: "${value}"`)
    seen.add(value)
  })
}

export function validateBookmarkData(value: unknown): BookmarkData {
  const errors: string[] = []
  if (!isRecord(value)) throw new Error('Bookmark data must be an object')

  const categories = Array.isArray(value.categories)
    ? value.categories
        .map((item, index) => parseCategory(item, index, errors))
        .filter((item): item is Category => Boolean(item))
    : []
  if (!Array.isArray(value.categories)) errors.push('categories must be an array')

  const bookmarks = Array.isArray(value.bookmarks)
    ? value.bookmarks
        .map((item, index) => parseBookmark(item, index, errors))
        .filter((item): item is Bookmark => Boolean(item))
    : []
  if (!Array.isArray(value.bookmarks)) errors.push('bookmarks must be an array')

  reportDuplicates(categories.map(({ id }) => id), 'category', errors)
  reportDuplicates(bookmarks.map(({ id }) => id), 'bookmark', errors)

  const dailyPositions = new Map<number, string>()
  const collectionPositions = new Map<string, string>()
  bookmarks.forEach((bookmark, index) => {
    if (bookmark.dailyPosition !== undefined) {
      const existingBookmarkId = dailyPositions.get(bookmark.dailyPosition)
      if (existingBookmarkId) {
        errors.push(
          `bookmarks[${index}].dailyPosition duplicates position ${bookmark.dailyPosition} used by "${existingBookmarkId}"`,
        )
      } else {
        dailyPositions.set(bookmark.dailyPosition, bookmark.id)
      }
    }
    if (bookmark.placement) {
      const key = `${bookmark.placement.collection}:${bookmark.placement.position}`
      const existingBookmarkId = collectionPositions.get(key)
      if (existingBookmarkId) {
        errors.push(`bookmarks[${index}].placement duplicates ${key} used by "${existingBookmarkId}"`)
      } else {
        collectionPositions.set(key, bookmark.id)
      }
    }
  })

  const bookmarkUrls = new Map<string, string>()
  bookmarks.forEach((bookmark, index) => {
    let normalizedUrl: string
    try {
      normalizedUrl = new URL(bookmark.url).href
    } catch {
      return
    }
    const existingBookmarkId = bookmarkUrls.get(normalizedUrl)
    if (existingBookmarkId) {
      errors.push(
        `bookmarks[${index}].url duplicates URL used by "${existingBookmarkId}"`,
      )
    } else {
      bookmarkUrls.set(normalizedUrl, bookmark.id)
    }
  })

  const categoryById = new Map(categories.map((category) => [category.id, category]))
  categories.forEach((category, index) => {
    if (!category.parentId) return
    if (!categoryById.has(category.parentId)) {
      errors.push(`categories[${index}].parentId references unknown category "${category.parentId}"`)
    }
    if (category.parentId === category.id) errors.push(`categories[${index}] cannot be its own parent`)

    const lineage = new Set([category.id])
    let current = categoryById.get(category.parentId)
    while (current) {
      if (lineage.has(current.id)) {
        errors.push(`category hierarchy contains a cycle involving "${current.id}"`)
        break
      }
      lineage.add(current.id)
      current = current.parentId ? categoryById.get(current.parentId) : undefined
    }
  })

  bookmarks.forEach((bookmark, bookmarkIndex) => {
    const membershipIds = new Set<string>()
    bookmark.categories.forEach(({ categoryId }, membershipIndex) => {
      if (!categoryById.has(categoryId)) {
        errors.push(`bookmarks[${bookmarkIndex}].categories[${membershipIndex}] references unknown category "${categoryId}"`)
      }
      if (membershipIds.has(categoryId)) {
        errors.push(`bookmarks[${bookmarkIndex}] has duplicate category membership "${categoryId}"`)
      }
      membershipIds.add(categoryId)
    })
  })

  const uniqueErrors = [...new Set(errors)]
  if (uniqueErrors.length) throw new Error(`Invalid bookmark data:\n- ${uniqueErrors.join('\n- ')}`)
  return { categories, bookmarks }
}

export function comparePositionAndTitle(positionA: number, titleA: string, positionB: number, titleB: string) {
  return positionA - positionB || titleA.localeCompare(titleB, undefined, { sensitivity: 'base' })
}

export const sortCategories = (categories: Category[]) =>
  [...categories].sort((a, b) => comparePositionAndTitle(a.position, a.name, b.position, b.name))

export const childCategories = (categories: Category[], parentId?: string) =>
  sortCategories(categories.filter((category) => category.parentId === parentId))

export const rootCategories = (categories: Category[]) => childCategories(categories)

export function descendantCategoryIds(categories: Category[], categoryId: string) {
  const ids = new Set([categoryId])
  const queue = [categoryId]
  while (queue.length) {
    const parentId = queue.shift()!
    categories.forEach((category) => {
      if (category.parentId === parentId && !ids.has(category.id)) {
        ids.add(category.id)
        queue.push(category.id)
      }
    })
  }
  return ids
}

export const dailyBookmarks = (bookmarks: Bookmark[]) =>
  bookmarks
    .filter((bookmark) => bookmark.dailyPosition !== undefined)
    .sort((a, b) => comparePositionAndTitle(a.dailyPosition!, a.title, b.dailyPosition!, b.title))

const compareSubscription = (a: Bookmark, b: Bookmark) =>
  Number(a.subscribed === false) - Number(b.subscribed === false)

export const bookmarksForCategory = (bookmarks: Bookmark[], categoryId: string) =>
  bookmarks
    .filter((bookmark) => bookmark.categories.some((membership) => membership.categoryId === categoryId))
    .sort((a, b) => {
      const aPosition = a.categories.find((membership) => membership.categoryId === categoryId)!.position
      const bPosition = b.categories.find((membership) => membership.categoryId === categoryId)!.position
      return compareSubscription(a, b) || comparePositionAndTitle(aPosition, a.title, bPosition, b.title)
    })

export const bookmarksForCategoryTree = (data: BookmarkData, categoryId: string) => {
  const ids = descendantCategoryIds(data.categories, categoryId)
  return data.bookmarks
    .filter((bookmark) => bookmark.categories.some((membership) => ids.has(membership.categoryId)))
    .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }))
}

function categoryLineageNames(categories: Category[], categoryId: string) {
  const categoryById = new Map(categories.map((category) => [category.id, category]))
  const names: string[] = []
  let current = categoryById.get(categoryId)
  while (current) {
    names.push(current.name)
    current = current.parentId ? categoryById.get(current.parentId) : undefined
  }
  return names
}

export const normalizeSearch = (value: string) =>
  value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim()

export function searchBookmarks(data: BookmarkData, query: string) {
  const normalizedQuery = normalizeSearch(query)
  if (!normalizedQuery) return []
  return data.bookmarks
    .filter((bookmark) => {
      const hostname = new URL(bookmark.url).hostname.replace(/^www\./, '')
      const searchable = [
        bookmark.title,
        bookmark.description,
        hostname,
        ...(bookmark.tags ?? []),
        ...bookmark.categories.flatMap((item) => categoryLineageNames(data.categories, item.categoryId)),
      ]
      return normalizeSearch(searchable.filter(Boolean).join(' ')).includes(normalizedQuery)
    })
    .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }))
}
