import { useEffect, useRef, useState } from 'react'
import { normalizeSearch } from '../data'
import type { V2Bookmark, V2Collection } from '../v2'
import {
  bucketSettingsStorageKey, bucketStorageKey, legacyYouTubeBucketKeys, readBucketSettings, readBucketGroups,
  type Bucket, type BucketCategory, type BucketGroup, type BucketSettingsData,
} from '../buckets'
import { BucketSettings } from './BucketSettings'

function CategoryOptions({ categories }: { categories: BucketCategory[] }) {
  return <>
    <option value="">No category</option>
    {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
  </>
}

function GroupCategoryCounts({ name, categories, counts, activeCategoryId, onToggle }: {
  name: string
  categories: BucketCategory[]
  counts: Map<string, number>
  activeCategoryId: string | undefined
  onToggle: (categoryId: string) => void
}) {
  if (!counts.size && !activeCategoryId) return null
  return <ul className="bucket-category-counts" aria-label={`Category totals for ${name}`}>
    {categories.filter(category => counts.has(category.id) || category.id === activeCategoryId).map(category => <li key={category.id}>
      <button type="button" className="bucket-category-label" title={category.name}
        aria-pressed={category.id === activeCategoryId} onClick={() => onToggle(category.id)}>
        #{category.displayName} <strong>{counts.get(category.id) ?? 0}</strong>
      </button>
    </li>)}
  </ul>
}

export function BucketBoard({ collection, entries }: { collection: V2Collection; entries: V2Bookmark[] }) {
  const [groups, setGroups] = useState(() => readBucketGroups(collection))
  const storageKey = bucketStorageKey + collection
  const title = collection === 'youtube' ? 'YouTube buckets' : 'Web buckets'
  const item = collection === 'youtube' ? 'channel' : 'bookmark'
  const [settings, setSettings] = useState<BucketSettingsData>(() => (
    collection === 'youtube' ? readBucketSettings() : { categories: [], assignments: {}, channelLimit: null }
  ))
  const [settingsError, setSettingsError] = useState(false)
  const { categories, channelLimit } = settings
  const categoriesById = new Map(categories.map(category => [category.id, category]))
  const categoryOptionsKey = JSON.stringify([...categoriesById.keys()])
  const categoryFor = (id: string) => categoriesById.get(settings.assignments[id])
  const [selected, setSelected] = useState<{ id: string; bucketId: string } | null>(null)
  const [name, setName] = useState('')
  const [groupName, setGroupName] = useState('')
  const [newBucketGroup, setNewBucketGroup] = useState('')
  const activeGroup = groups.find(group => group.id === newBucketGroup) ?? groups[0]
  const [count, setCount] = useState(5)
  const [message, setMessage] = useState('')
  const [error, setError] = useState(false)
  const [blocked, setBlocked] = useState<Record<string, { signature: string; ids: string[] }>>({})
  const [queries, setQueries] = useState<Record<string, string>>({})
  const [targetSlots, setTargetSlots] = useState<Record<string, number>>({})
  const [categoryFilters, setCategoryFilters] = useState<Record<string, string>>({})
  const searchInputs = useRef<Record<string, HTMLInputElement | null>>({})
  const byId = new Map(entries.map(e => [e.bookmark.id, e.bookmark]))
  const groupChannelIds = (group: BucketGroup) => new Set(group.buckets.flatMap(bucket =>
    bucket.slots.filter((id): id is string => id !== null && byId.has(id)),
  ))

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === storageKey || event.key === null || (collection === 'youtube' && legacyYouTubeBucketKeys.some(key => key === event.key))) {
        setGroups(readBucketGroups(collection))
        setSelected(null)
      }
      if (collection === 'youtube' && (event.key === bucketSettingsStorageKey || event.key === null)) {
        setSettings(readBucketSettings())
        setSettingsError(false)
      }
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [collection, storageKey])
  const saveGroups = (next: BucketGroup[]) => {
    setGroups(next)
    try { localStorage.setItem(storageKey, JSON.stringify(next)); setError(false) } catch { setError(true) }
  }
  const currentGroups = () => error ? groups : readBucketGroups(collection, groups)
  const updateGroups = (update: (current: BucketGroup[]) => BucketGroup[]) => saveGroups(update(currentGroups()))
  const updateBucket = (bucketId: string, update: (bucket: Bucket) => Bucket) => {
    updateGroups(current => current.map(group => group.buckets.some(bucket => bucket.id === bucketId) ? {
      ...group, buckets: group.buckets.map(bucket => bucket.id === bucketId ? update(bucket) : bucket),
    } : group))
  }
  const currentSettings = () => settingsError ? settings : readBucketSettings()
  const updateSettings = (update: (current: BucketSettingsData) => BucketSettingsData) => {
    const current = currentSettings()
    const next = update(current)
    setSettings(next)
    if (next === current) return
    try {
      localStorage.setItem(bucketSettingsStorageKey, JSON.stringify(next))
      setSettingsError(false)
    } catch {
      setSettingsError(true)
    }
  }
  const saveChannelLimit = (limit: number | null) => {
    if (limit !== null) {
      const largestGroup = currentGroups().reduce((largest, group) => Math.max(largest, groupChannelIds(group).size), 0)
      if (limit < largestGroup) return `A group already has ${largestGroup} channels. Remove channels or enter a limit of ${largestGroup} or more.`
    }
    updateSettings(current => ({ ...current, channelLimit: limit }))
    setMessage(limit === null ? 'Group channel limit cleared.' : 'Group channel limit saved.')
  }
  const assignCategory = (id: string, categoryId: string) => {
    updateSettings(current => {
      if (categoryId && !current.categories.some(category => category.id === categoryId)) return current
      const assignments = { ...current.assignments, [id]: categoryId }
      if (!categoryId) delete assignments[id]
      return { ...current, assignments }
    })
  }
  const place = (id: string, bucketId: string, index: number, categoryId?: string) => {
    if (!byId.has(id)) return
    const current = currentGroups()
    const group = current.find(group => group.buckets.some(bucket => bucket.id === bucketId))
    const target = group?.buckets.find(bucket => bucket.id === bucketId)
    if (!group || !target || index < 0 || index >= target.slots.length) { setMessage('Choose an empty slot or add a slot first.'); return }
    const occupant = target.slots[index]
    if (occupant && byId.has(occupant)) { setMessage('That slot is occupied. Clear it first or choose an empty slot.'); return }
    const limit = collection === 'youtube' ? currentSettings().channelLimit : null
    if (limit !== null) {
      const ids = groupChannelIds(group)
      if (ids.size >= limit && !ids.has(id)) {
        setMessage(`${group.name} has reached its channel limit of ${limit}. Remove a channel to make room.`)
        return
      }
    }
    saveGroups(current.map(item => item === group ? {
      ...item, buckets: item.buckets.map(bucket => ({
        ...bucket, slots: bucket.slots.map((slot, i) => bucket.id === bucketId && i === index ? id : slot === id ? null : slot),
      })),
    } : item))
    if (categoryId !== undefined) assignCategory(id, categoryId)
    setSelected(null)
    setMessage(`${byId.get(id)!.title} placed in ${target.name}.`)
  }
  const bucketEntries = (bucket: Bucket) => [...new Set(bucket.slots)].flatMap(id => id && byId.has(id) ? [byId.get(id)!] : [])
  const countGroupCategories = (ids: Set<string>) => {
    const counts = new Map<string, number>()
    if (!categories.length) return counts
    for (const id of ids) {
      const category = categoryFor(id)
      if (category) counts.set(category.id, (counts.get(category.id) ?? 0) + 1)
    }
    return counts
  }
  const signature = (bookmarks: ReturnType<typeof bucketEntries>) => JSON.stringify(bookmarks.map(b => [b.id, b.url]))
  const openBucket = (bucket: Bucket, bookmarks: ReturnType<typeof bucketEntries>, pending: string[] | undefined) => {
    const failed: string[] = []
    for (const bookmark of bookmarks) {
      if (pending?.length && !pending.includes(bookmark.id)) continue
      // Opening a blank tab first lets us distinguish blocking from a tab with no opener.
      const tab = window.open('about:blank', '_blank')
      if (!tab) { failed.push(bookmark.id); continue }
      tab.opener = null
      const link = tab.document.createElement('a')
      link.href = bookmark.url
      link.rel = 'noopener noreferrer'
      link.referrerPolicy = 'no-referrer'
      tab.document.body.append(link)
      link.click()
    }
    setBlocked(current => ({ ...current, [bucket.id]: { signature: signature(bookmarks), ids: failed } }))
    setMessage(failed.length
      ? `${bucket.name}: your browser blocked ${failed.length} ${failed.length === 1 ? 'tab' : 'tabs'}. Allow pop-ups for this site, then use this bucket’s Open remaining button.`
      : `${bucket.name}: all ${item}s opened.`)
  }
  return <section className="bucket-board" aria-labelledby="bucket-title">
    <div className="bucket-intro">
      <h2 id="bucket-title">{title}</h2>
      <p>Use Move here to switch buckets within a group. You can add the same {item} to another group.</p>
    </div>
    {collection === 'youtube' && <BucketSettings categories={categories} channelLimit={channelLimit}
      onSaveChannelLimit={saveChannelLimit} onChange={updateSettings} />}
    {groups.map(group => {
      const activeCategoryId = categoriesById.get(categoryFilters[group.id])?.id
      const channelIds = groupChannelIds(group)
      const groupAtLimit = channelLimit !== null && channelIds.size >= channelLimit
      const counts = countGroupCategories(channelIds)
      const matchesCategory = (id: string) => !activeCategoryId || categoryFor(id)?.id === activeCategoryId
      return <section className="bucket-group" key={group.id} aria-label={`Bucket group ${group.name}`}>
      <div className="bucket-group-heading">
        <label>Group
          <span className="bucket-group-name" data-value={group.name}>
            <textarea aria-label={`Rename ${group.name} group`} rows={1} maxLength={60} value={group.name}
              onKeyDown={event => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) event.preventDefault() }}
              onChange={event => {
                const name = event.target.value.replace(/[\r\n]+/g, ' ')
                updateGroups(current => current.map(item => item.id === group.id ? { ...item, name } : item))
              }} />
          </span>
        </label>
        {channelLimit !== null && <small className="bucket-group-capacity">
          {channelIds.size} / {channelLimit} channels{groupAtLimit && ' · Limit reached'}
        </small>}
        <GroupCategoryCounts name={group.name} categories={categories} counts={counts} activeCategoryId={activeCategoryId}
          onToggle={categoryId => {
            setCategoryFilters(current => ({ ...current, [group.id]: activeCategoryId === categoryId ? '' : categoryId }))
            setSelected(null)
          }} />
        {!group.buckets.length && <button type="button" onClick={() => updateGroups(current => current.filter(item => item.id !== group.id || item.buckets.length > 0))}>Delete empty group</button>}
      </div>
      {!group.buckets.length && <p className="bucket-group-empty">Add your first bucket to this group using the form below.</p>}
      {activeCategoryId && !counts.has(activeCategoryId) && <p className="bucket-group-empty">No channels match this category.</p>}
    <div className="bucket-grid">{group.buckets.map(bucket => {
      const visibleEntries = bucketEntries(bucket).filter(bookmark => matchesCategory(bookmark.id))
      if (activeCategoryId && !visibleEntries.length) return null
      const pending = blocked[bucket.id]?.signature === signature(visibleEntries) ? blocked[bucket.id].ids : undefined
      const openLabel = pending?.length ? 'Open remaining' : activeCategoryId ? 'Open matching' : 'Open all'
      const query = queries[bucket.id] ?? ''
      const terms = normalizeSearch(query).split(/\s+/).map(term => term.replace(/^#/, '')).filter(Boolean)
      const matches = terms.length ? entries.filter(({ bookmark, tags }) => {
        if (!matchesCategory(bookmark.id)) return false
        const category = categoryFor(bookmark.id)
        const text = normalizeSearch([bookmark.title, bookmark.description ?? '', bookmark.url, ...tags, category?.name, category?.displayName].join(' '))
        return terms.every(term => text.includes(term))
      }) : []
      const requestedSlot = targetSlots[bucket.id]
      const isEmpty = (id: string | null) => !id || !byId.has(id)
      const emptySlot = requestedSlot !== undefined && requestedSlot < bucket.slots.length && isEmpty(bucket.slots[requestedSlot])
        ? requestedSlot : bucket.slots.findIndex(isEmpty)
      return <article className="bucket" key={bucket.id}>
      <div className="bucket-heading"><input aria-label={`Rename ${bucket.name} bucket`} maxLength={60} value={bucket.name} onChange={e => updateBucket(bucket.id, current => ({ ...current, name: e.target.value }))} /><small>{bucket.slots.filter(id => id && byId.has(id)).length}/{bucket.slots.length}</small></div>
      <button type="button" className="v2-lucky bucket-open" disabled={!visibleEntries.length}
        aria-label={`${openLabel} in ${bucket.name}`}
        title={`Open the shown ${item}s in new tabs, in slot order`}
        onClick={() => openBucket(bucket, visibleEntries, pending)}>
        {openLabel} ({pending?.length || visibleEntries.length}) ↗
      </button>
      <div className="bucket-search">
        <label>Find a {item}
          <input type="search" aria-label={`Search library for ${bucket.name}`} placeholder={`${item === 'channel' ? 'Channel' : 'Title'}, topic, or #tags…`} autoComplete="off"
            ref={input => { searchInputs.current[bucket.id] = input }} value={query}
            onChange={event => setQueries(current => ({ ...current, [bucket.id]: event.target.value }))} />
        </label>
        {query && <button type="button" className="bucket-search-clear" aria-label={`Clear search for ${bucket.name}`} onClick={() => {
          setQueries(current => ({ ...current, [bucket.id]: '' }))
          searchInputs.current[bucket.id]?.focus()
        }}>Clear search</button>}
        {emptySlot < 0 && <p>Bucket full. Add a slot or remove a {item} to make room.</p>}
        {!!terms.length && <>
          <p aria-live="polite">{matches.length ? `${matches.length} matching ${item}${matches.length === 1 ? '' : 's'}` : `No ${item}s found. Try another name, topic, or tag.`}</p>
          <ul className="bucket-search-results" aria-label={`Library results for ${bucket.name}`}>
            {matches.map(({ bookmark, tags }) => {
              const source = group.buckets.find(b => b.slots.includes(bookmark.id))
              const added = source?.id === bucket.id
              const canPlace = emptySlot >= 0 && (!groupAtLimit || !!source)
              const category = categoryFor(bookmark.id)
              return <li key={bookmark.id}>
                <div><strong>{bookmark.title}</strong>
                  {category && <> <span className="bucket-category-label" title={category.name}>#{category.displayName}</span></>}
                  {bookmark.description && <p>{bookmark.description}</p>}
                  {!!tags.length && <small>{tags.map(tag => `#${tag}`).join(' ')}</small>}
                  {source && !added && <small>In {source.name}</small>}
                </div>
                <form className="bucket-result-actions" onSubmit={event => {
                  event.preventDefault()
                  if (added || !canPlace) return
                  const chosen = new FormData(event.currentTarget).get('category')
                  const categoryId = typeof chosen === 'string' && chosen !== (category?.id ?? '') ? chosen : undefined
                  place(bookmark.id, bucket.id, emptySlot, categoryId)
                }}>
                  {!!categories.length && !added && <select key={`${category?.id ?? ''}:${categoryOptionsKey}`} name="category" defaultValue={category?.id ?? ''}
                    aria-label={`Category when adding ${bookmark.title} to ${bucket.name}`} disabled={!canPlace}>
                    <CategoryOptions categories={categories} />
                  </select>}
                  <button type="submit" disabled={added || !canPlace}
                    aria-label={`${added ? 'Added' : source ? 'Move' : 'Add'} ${bookmark.title} to ${bucket.name}`}>
                    {added ? 'Added' : source ? 'Move here' : 'Add'}
                  </button>
                </form>
              </li>
            })}
          </ul>
        </>}
      </div>
      <ol className="bucket-slots">{bucket.slots.map((id, index) => {
        const bookmark = id ? byId.get(id) : undefined
        const category = bookmark ? categoryFor(bookmark.id) : undefined
        if (activeCategoryId && (bookmark ? category?.id !== activeCategoryId : !selected)) return null
        return <li key={index} className={`bucket-slot${bookmark ? ' is-filled' : ''}`} onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = selected && group.buckets.some(item => item.id === selected.bucketId) ? 'move' : 'copy' }} onDrop={e => { e.preventDefault(); place(e.dataTransfer.getData('text/plain'), bucket.id, index) }}>
          <span className="slot-number">{String(index + 1).padStart(2, '0')}</span>
          {bookmark ? <>
            <div className="slot-title">
              <a className="slot-channel" href={bookmark.url} target="_blank" rel="noopener noreferrer" draggable={false}>{bookmark.title}</a>
              {!!categories.length && <>{' '}<span className="slot-category" title={category?.name ?? 'Set channel category'}>
                <span className="bucket-category-label" aria-hidden="true">{category ? `#${category.displayName}` : '+#'}</span>
                <select aria-label={`Category for ${bookmark.title} in ${bucket.name}`} value={category?.id ?? ''}
                  onChange={event => assignCategory(bookmark.id, event.target.value)}>
                  <CategoryOptions categories={categories} />
                </select>
              </span></>}
            </div>
            <button type="button" className="slot-drag" draggable
              aria-label={`Move ${bookmark.title}`} aria-pressed={selected?.id === bookmark.id && selected.bucketId === bucket.id}
              title="Choose an empty slot: move within this group, copy to another group"
              onDragStart={e => { e.dataTransfer.effectAllowed = 'copyMove'; e.dataTransfer.setData('text/plain', bookmark.id); setSelected({ id: bookmark.id, bucketId: bucket.id }) }}
              onDragEnd={() => setSelected(null)}
              onClick={() => setSelected(selected?.id === bookmark.id && selected.bucketId === bucket.id ? null : { id: bookmark.id, bucketId: bucket.id })}>⠿</button>
            <button aria-label={`Remove ${bookmark.title} from ${bucket.name}`} onClick={() => {
            updateBucket(bucket.id, current => ({
              ...current, slots: current.slots.map((slot, i) => i === index && slot === bookmark.id ? null : slot),
            }))
            if (selected?.id === bookmark.id && selected.bucketId === bucket.id) setSelected(null)
          }}>×</button></> : <button className="empty-slot" disabled={!!selected && groupAtLimit && !channelIds.has(selected.id)} onClick={() => {
            if (selected) place(selected.id, bucket.id, index)
            else {
              setTargetSlots(current => ({ ...current, [bucket.id]: index }))
              searchInputs.current[bucket.id]?.focus()
              setMessage(`Search for a ${item} to fill ${bucket.name} slot ${index + 1}.`)
            }
          }} aria-label={`Place selected ${item} in ${bucket.name} slot ${index + 1}`}>{selected ? '✧ Place here' : '+ Empty slot'}</button>}
        </li>
      })}</ol>
      <div className="bucket-controls">
        <button disabled={bucket.slots.length >= 20} onClick={() => updateBucket(bucket.id, current =>
          current.slots.length < 20 ? { ...current, slots: [...current.slots, null] } : current)}>+ Slot</button>
        <button disabled={bucket.slots.length <= 1 || !!bucket.slots.at(-1)} onClick={() => updateBucket(bucket.id, current =>
          current.slots.length > 1 && !current.slots.at(-1) ? { ...current, slots: current.slots.slice(0, -1) } : current)}>− Empty slot</button>
        <button onClick={() => {
          updateGroups(current => current.map(item => item.id === group.id ? {
            ...item, buckets: item.buckets.filter(existing => existing.id !== bucket.id),
          } : item))
          setSelected(null)
          setMessage('Bucket removed.')
        }}>Delete bucket</button>
      </div>
    </article>})}</div>
    </section>})}
    <form className="bucket-create" onSubmit={event => {
      event.preventDefault()
      if (!groupName.trim()) return
      const id = crypto.randomUUID()
      updateGroups(current => [...current, { id, name: groupName.trim(), buckets: [] }])
      setNewBucketGroup(id)
      setGroupName('')
      setMessage('Group created. Add buckets below.')
    }}><label>New group<input required maxLength={60} value={groupName} placeholder="Another angle…" onChange={event => setGroupName(event.target.value)} /></label><button type="submit">+ Create group</button></form>
    {!!groups.length && <form className="bucket-create" onSubmit={e => {
      e.preventDefault()
      if (!name.trim() || !activeGroup) return
      updateGroups(current => current.map(group => group.id === activeGroup.id ? {
        ...group, buckets: [...group.buckets, { id: crypto.randomUUID(), name: name.trim(), slots: Array(count).fill(null) }],
      } : group))
      setName('')
    }}><label>New bucket<input required maxLength={60} value={name} placeholder="Dream up a shelf…" onChange={e => setName(e.target.value)} /></label><label>In group<select value={activeGroup?.id ?? ''} onChange={event => setNewBucketGroup(event.target.value)}>{groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label><label>Slots<select value={count} onChange={e => setCount(Number(e.target.value))}>{Array.from({ length: 20 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}</select></label><button type="submit">+ Create bucket</button></form>}
    {!entries.length && <p>Your {collection === 'youtube' ? 'YouTube' : 'Web'} library is empty.</p>}
    <p role="status">{error || settingsError ? 'Browser storage is unavailable. Unsaved changes will last until you reload.' : message || 'Saved in this browser.'}</p>
  </section>
}
