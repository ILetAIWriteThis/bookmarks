export type Bucket = { id: string; name: string; slots: (string | null)[] }
export type BucketGroup = { id: string; name: string; buckets: Bucket[] }

export const bucketStorageKey = 'bookmarks:buckets:v2:'
export const legacyBucketStorageKey = 'bookmarks:buckets:v1:'

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

export function readBucketGroups(scope: string): BucketGroup[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(bucketStorageKey + scope) ?? 'null')
    if (Array.isArray(raw) && raw.every(isGroup)
      && new Set(raw.map(group => group.id)).size === raw.length
      && new Set(raw.flatMap(group => group.buckets.map(bucket => bucket.id))).size === raw.flatMap(group => group.buckets).length) return raw
  } catch { /* Fall back to the previous board. */ }
  let buckets: Bucket[] | undefined
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(legacyBucketStorageKey + scope) ?? 'null')
    if (Array.isArray(raw) && raw.every(isBucket)) buckets = raw
  } catch { /* Use defaults when storage is unavailable. */ }
  buckets ??= (scope === 'youtube-listen' ? ['Recurring', 'Good Stories'] : ['Next adventures', 'Hidden gems'])
    .map((name, i) => ({ id: `starter-${i}`, name, slots: Array(5).fill(null) }))
  return [{ id: 'starter-group', name: 'My buckets', buckets }]
}
