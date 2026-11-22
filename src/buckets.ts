import type { V2Collection } from './v2'

export type Bucket = { id: string; name: string; slots: (string | null)[] }
export type BucketGroup = { id: string; name: string; buckets: Bucket[] }
export type BucketCategory = { id: string; name: string; displayName: string }
export type BucketSettingsData = {
  categories: BucketCategory[]
  assignments: Record<string, string>
  channelLimit: number | null
}

export const bucketStorageKey = 'bookmarks:buckets:v2:'
export const bucketSettingsStorageKey = 'bookmarks:buckets:categories:v1:youtube'
const legacyBucketStorageKey = 'bookmarks:buckets:v1:'
const legacyYouTubeScopes = ['youtube-listen', 'youtube-watch'] as const

export const legacyYouTubeBucketKeys = legacyYouTubeScopes.flatMap(scope => [
  bucketStorageKey + scope, legacyBucketStorageKey + scope,
])

function isBucket(value: unknown): value is Bucket {
  if (!value || typeof value !== 'object') return false
  const bucket = value as Partial<Bucket>
  return typeof bucket.id === 'string' && typeof bucket.name === 'string'
    && Array.isArray(bucket.slots) && bucket.slots.length > 0 && bucket.slots.length <= 20
    && bucket.slots.every(slot => slot === null || typeof slot === 'string')
}

function isGroup(value: unknown): value is BucketGroup {
  if (!value || typeof value !== 'object') return false
  const group = value as Partial<BucketGroup>
  return typeof group.id === 'string' && typeof group.name === 'string'
    && Array.isArray(group.buckets) && group.buckets.every(isBucket)
}

function readStorage(key: string): unknown {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null')
  } catch {
    return null
  }
}

function uniqueIds(items: { id: string }[]) {
  return new Set(items.map(item => item.id)).size === items.length
}

function isBucketCategory(value: unknown): value is BucketCategory {
  if (!value || typeof value !== 'object') return false
  const category = value as Partial<BucketCategory>
  return typeof category.id === 'string' && !!category.id
    && typeof category.name === 'string' && !!category.name.trim()
    && typeof category.displayName === 'string' && !!category.displayName.trim()
}

export function isChannelLimit(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}

export function readBucketSettings(): BucketSettingsData {
  const stored = readStorage(bucketSettingsStorageKey) as Partial<BucketSettingsData> | null
  const candidates = Array.isArray(stored?.categories) ? stored.categories.filter(isBucketCategory) : []
  const categories = uniqueIds(candidates) ? candidates : []
  const categoryIds = new Set(categories.map(category => category.id))
  const savedAssignments = stored?.assignments
  const assignments = savedAssignments && typeof savedAssignments === 'object' && !Array.isArray(savedAssignments)
    ? Object.fromEntries(Object.entries(savedAssignments).filter(([, categoryId]) => categoryIds.has(categoryId)))
    : {}
  const channelLimit = isChannelLimit(stored?.channelLimit) ? stored.channelLimit : null
  return { categories, assignments, channelLimit }
}

function readGroups(key: string): BucketGroup[] | undefined {
  const stored = readStorage(key)
  if (Array.isArray(stored) && stored.every(isGroup) &&
    uniqueIds(stored) && uniqueIds(stored.flatMap(group => group.buckets))) return stored
}

function readLegacyYouTubeGroups(scope: typeof legacyYouTubeScopes[number]): BucketGroup[] | undefined {
  const groups = readGroups(bucketStorageKey + scope)
  if (groups) return groups
  const buckets = readStorage(legacyBucketStorageKey + scope)
  if (Array.isArray(buckets) && buckets.every(isBucket) && uniqueIds(buckets)) {
    return [{ id: 'starter-group', name: 'My buckets', buckets }]
  }
}

export function readBucketGroups(collection: V2Collection, fallback?: BucketGroup[]): BucketGroup[] {
  const saved = readGroups(bucketStorageKey + collection)
  if (saved) return saved

  if (collection === 'youtube') {
    const [listen, watch] = legacyYouTubeScopes.map(readLegacyYouTubeGroups)
    if (listen?.length && watch?.length) {
      const listenNames = new Set(listen.map(group => group.name))
      // The old boards could share IDs. Keep their groups separate so their slots can overlap.
      return [
        ...listen.map(group => namespaceGroup(group, 'listen')),
        ...watch.map(group => namespaceGroup({
          ...group, name: listenNames.has(group.name) ? `${group.name} (Watch)` : group.name,
        }, 'watch')),
      ]
    }
    if (listen || watch) return listen?.length ? listen : watch ?? []
  }

  if (fallback) return fallback

  const names = collection === 'youtube' ? ['Recurring', 'Good Stories'] : ['Reference', 'To read']
  const buckets = names.map((name, i) => ({ id: `starter-${i}`, name, slots: Array(5).fill(null) }))
  return [{ id: 'starter-group', name: 'My buckets', buckets }]
}

function namespaceGroup(group: BucketGroup, prefix: string): BucketGroup {
  return {
    ...group,
    id: `${prefix}:${group.id}`,
    buckets: group.buckets.map(bucket => ({ ...bucket, id: `${prefix}:${bucket.id}` })),
  }
}
