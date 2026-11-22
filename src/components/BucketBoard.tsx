import { useEffect, useRef, useState } from 'react'
import { normalizeSearch } from '../data'
import type { V2Bookmark, V2Collection } from '../v2'
import { bucketStorageKey, legacyYouTubeBucketKeys, readBucketGroups, type Bucket, type BucketGroup } from '../buckets'

export function BucketBoard({ collection, entries }: { collection: V2Collection; entries: V2Bookmark[] }) {
  const [groups, setGroups] = useState(() => readBucketGroups(collection))
  const storageKey = bucketStorageKey + collection
  const title = collection === 'youtube' ? 'YouTube buckets' : 'Web buckets'
  const item = collection === 'youtube' ? 'channel' : 'bookmark'
  const buckets = groups.flatMap(group => group.buckets)
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
  const searchInputs = useRef<Record<string, HTMLInputElement | null>>({})
  const byId = new Map(entries.map(e => [e.bookmark.id, e.bookmark]))
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === storageKey || event.key === null || (collection === 'youtube' && legacyYouTubeBucketKeys.some(key => key === event.key))) {
        setGroups(readBucketGroups(collection))
        setSelected(null)
      }
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [collection, storageKey])
  const saveGroups = (next: BucketGroup[]) => {
    setGroups(next)
    try { localStorage.setItem(storageKey, JSON.stringify(next)); setError(false) } catch { setError(true) }
  }
  const save = (next: Bucket[]) => saveGroups(groups.map(group => ({
    ...group, buckets: next.filter(bucket => group.buckets.some(existing => existing.id === bucket.id)),
  })))
  const place = (id: string, bucketId: string, index: number) => {
    if (!byId.has(id)) return
    const target = buckets.find(b => b.id === bucketId)
    const group = groups.find(group => group.buckets.some(bucket => bucket.id === bucketId))
    if (!target || index < 0 || index >= target.slots.length) { setMessage('Choose an empty slot or add a slot first.'); return }
    if (target.slots[index] && byId.has(target.slots[index]!)) { setMessage('That slot is occupied. Clear it first or choose an empty slot.'); return }
    save(buckets.map(b => group?.buckets.some(bucket => bucket.id === b.id)
      ? { ...b, slots: b.slots.map((s, i) => b.id === bucketId && i === index ? id : s === id ? null : s) }
      : b))
    setSelected(null)
    setMessage(`${byId.get(id)!.title} placed in ${target.name}.`)
  }
  const bucketEntries = (bucket: Bucket) => [...new Set(bucket.slots)].flatMap(id => id && byId.has(id) ? [byId.get(id)!] : [])
  const signature = (bucket: Bucket) => JSON.stringify(bucketEntries(bucket).map(b => [b.id, b.url]))
  const remaining = (bucket: Bucket) => blocked[bucket.id]?.signature === signature(bucket) ? blocked[bucket.id].ids : undefined
  const openBucket = (bucket: Bucket) => {
    const pending = remaining(bucket)
    const retry = pending?.length ? pending : undefined
    const failed: string[] = []
    for (const bookmark of bucketEntries(bucket)) {
      if (retry && !retry.includes(bookmark.id)) continue
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
    setBlocked(current => ({ ...current, [bucket.id]: { signature: signature(bucket), ids: failed } }))
    setMessage(failed.length
      ? `${bucket.name}: your browser blocked ${failed.length} ${failed.length === 1 ? 'tab' : 'tabs'}. Allow pop-ups for this site, then use this bucket’s Open remaining button.`
      : `${bucket.name}: all ${item}s opened.`)
  }
  return <section className="bucket-board" aria-labelledby="bucket-title">
    <div className="bucket-intro">
      <h2 id="bucket-title">{title}</h2>
      <p>Use Move here to switch buckets within a group. You can add the same {item} to another group.</p>
    </div>
    {groups.map(group => <section className="bucket-group" key={group.id} aria-label={`Bucket group ${group.name}`}>
      <div className="bucket-group-heading">
        <label>Group<input aria-label={`Rename ${group.name} group`} maxLength={60} value={group.name}
          onChange={event => saveGroups(groups.map(item => item.id === group.id ? { ...item, name: event.target.value } : item))} /></label>
        {!group.buckets.length && <button type="button" onClick={() => saveGroups(groups.filter(item => item.id !== group.id))}>Delete empty group</button>}
      </div>
      {!group.buckets.length && <p className="bucket-group-empty">Add your first bucket to this group using the form below.</p>}
    <div className="bucket-grid">{group.buckets.map(bucket => {
      const query = queries[bucket.id] ?? ''
      const terms = normalizeSearch(query).split(/\s+/).map(term => term.replace(/^#/, '')).filter(Boolean)
      const matches = terms.length ? entries.filter(({ bookmark, tags }) => {
        const text = normalizeSearch([bookmark.title, bookmark.description ?? '', bookmark.url, ...tags].join(' '))
        return terms.every(term => text.includes(term))
      }) : []
      const requestedSlot = targetSlots[bucket.id]
      const isEmpty = (id: string | null) => !id || !byId.has(id)
      const emptySlot = requestedSlot !== undefined && requestedSlot < bucket.slots.length && isEmpty(bucket.slots[requestedSlot])
        ? requestedSlot : bucket.slots.findIndex(isEmpty)
      return <article className="bucket" key={bucket.id}>
      <div className="bucket-heading"><input aria-label={`Rename ${bucket.name} bucket`} maxLength={60} value={bucket.name} onChange={e => save(buckets.map(b => b.id === bucket.id ? { ...b, name: e.target.value } : b))} /><small>{bucket.slots.filter(id => id && byId.has(id)).length}/{bucket.slots.length}</small></div>
      <button type="button" className="v2-lucky bucket-open" disabled={!bucketEntries(bucket).length}
        aria-label={`${remaining(bucket)?.length ? 'Open remaining' : 'Open all'} in ${bucket.name}`}
        title={`Open this bucket’s ${item}s in new tabs, in slot order`}
        onClick={() => openBucket(bucket)}>
        {remaining(bucket)?.length ? 'Open remaining' : 'Open all'} ({remaining(bucket)?.length || bucketEntries(bucket).length}) ↗
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
              return <li key={bookmark.id}>
                <div><strong>{bookmark.title}</strong>{bookmark.description && <p>{bookmark.description}</p>}
                  {!!tags.length && <small>{tags.map(tag => `#${tag}`).join(' ')}</small>}
                  {source && !added && <small>In {source.name}</small>}
                </div>
                <button type="button" disabled={added || emptySlot < 0}
                  aria-label={`${added ? 'Added' : source ? 'Move' : 'Add'} ${bookmark.title} to ${bucket.name}`}
                  onClick={() => place(bookmark.id, bucket.id, emptySlot)}>{added ? 'Added' : source ? 'Move here' : 'Add'}</button>
              </li>
            })}
          </ul>
        </>}
      </div>
      <ol className="bucket-slots">{bucket.slots.map((id, index) => {
        const bookmark = id ? byId.get(id) : undefined
        return <li key={index} className={`bucket-slot${bookmark ? ' is-filled' : ''}`} onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = selected && group.buckets.some(item => item.id === selected.bucketId) ? 'move' : 'copy' }} onDrop={e => { e.preventDefault(); place(e.dataTransfer.getData('text/plain'), bucket.id, index) }}>
          <span className="slot-number">{String(index + 1).padStart(2, '0')}</span>
          {bookmark ? <>
            <a className="slot-channel" href={bookmark.url} target="_blank" rel="noopener noreferrer" draggable={false}>{bookmark.title}</a>
            <button type="button" className="slot-drag" draggable
              aria-label={`Move ${bookmark.title}`} aria-pressed={selected?.id === bookmark.id && selected.bucketId === bucket.id}
              title="Choose an empty slot: move within this group, copy to another group"
              onDragStart={e => { e.dataTransfer.effectAllowed = 'copyMove'; e.dataTransfer.setData('text/plain', bookmark.id); setSelected({ id: bookmark.id, bucketId: bucket.id }) }}
              onDragEnd={() => setSelected(null)}
              onClick={() => setSelected(selected?.id === bookmark.id && selected.bucketId === bucket.id ? null : { id: bookmark.id, bucketId: bucket.id })}>⠿</button>
            <button aria-label={`Remove ${bookmark.title} from ${bucket.name}`} onClick={() => {
            save(buckets.map(b => b.id === bucket.id ? { ...b, slots: b.slots.map((s, i) => i === index ? null : s) } : b))
            if (selected?.id === bookmark.id && selected.bucketId === bucket.id) setSelected(null)
          }}>×</button></> : <button className="empty-slot" onClick={() => {
            if (selected) place(selected.id, bucket.id, index)
            else {
              setTargetSlots(current => ({ ...current, [bucket.id]: index }))
              searchInputs.current[bucket.id]?.focus()
              setMessage(`Search for a ${item} to fill ${bucket.name} slot ${index + 1}.`)
            }
          }} aria-label={`Place selected ${item} in ${bucket.name} slot ${index + 1}`}>{selected ? '✧ Place here' : '+ Empty slot'}</button>}
        </li>
      })}</ol>
      <div className="bucket-controls"><button disabled={bucket.slots.length >= 20} onClick={() => save(buckets.map(b => b.id === bucket.id ? { ...b, slots: [...b.slots, null] } : b))}>+ Slot</button><button disabled={bucket.slots.length <= 1 || !!bucket.slots.at(-1)} onClick={() => save(buckets.map(b => b.id === bucket.id ? { ...b, slots: b.slots.slice(0, -1) } : b))}>− Empty slot</button><button onClick={() => { save(buckets.filter(b => b.id !== bucket.id)); setSelected(null); setMessage('Bucket removed.') }}>Delete bucket</button></div>
    </article>})}</div>
    </section>)}
    <form className="bucket-create" onSubmit={event => {
      event.preventDefault()
      if (!groupName.trim()) return
      const id = crypto.randomUUID()
      saveGroups([...groups, { id, name: groupName.trim(), buckets: [] }])
      setNewBucketGroup(id)
      setGroupName('')
      setMessage('Group created. Add buckets below.')
    }}><label>New group<input required maxLength={60} value={groupName} placeholder="Another angle…" onChange={event => setGroupName(event.target.value)} /></label><button type="submit">+ Create group</button></form>
    {!!groups.length && <form className="bucket-create" onSubmit={e => {
      e.preventDefault()
      if (!name.trim() || !activeGroup) return
      saveGroups(groups.map(group => group.id === activeGroup.id ? {
        ...group, buckets: [...group.buckets, { id: crypto.randomUUID(), name: name.trim(), slots: Array(count).fill(null) }],
      } : group))
      setName('')
    }}><label>New bucket<input required maxLength={60} value={name} placeholder="Dream up a shelf…" onChange={e => setName(e.target.value)} /></label><label>In group<select value={activeGroup?.id ?? ''} onChange={event => setNewBucketGroup(event.target.value)}>{groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label><label>Slots<select value={count} onChange={e => setCount(Number(e.target.value))}>{Array.from({ length: 20 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}</select></label><button type="submit">+ Create bucket</button></form>}
    {!entries.length && <p>Your {collection === 'youtube' ? 'YouTube' : 'Web'} library is empty.</p>}
    <p role="status">{error ? 'Browser storage is unavailable. Bucket changes will last until you reload.' : message || 'Saved in this browser.'}</p>
  </section>
}
