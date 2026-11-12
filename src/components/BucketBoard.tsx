import { useEffect, useRef, useState } from 'react'
import { normalizeSearch } from '../data'
import type { V2Bookmark } from '../v2'

type Bucket = { id: string; name: string; slots: (string | null)[] }
const key = 'bookmarks:buckets:v1:'
function read(scope: string): Bucket[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(key + scope) ?? 'null')
    if (Array.isArray(raw) && raw.every(b => b && typeof b.id === 'string' && typeof b.name === 'string' && Array.isArray(b.slots) && b.slots.length > 0 && b.slots.length <= 20 && b.slots.every((s: unknown) => s === null || typeof s === 'string'))) return raw
  } catch { /* Use defaults when storage is unavailable. */ }
  return (scope === 'youtube-listen' ? ['Recurring', 'Good Stories'] : ['Next adventures', 'Hidden gems']).map((name, i) => ({ id: `starter-${i}`, name, slots: Array(5).fill(null) }))
}

export function BucketBoard({ scope, entries }: { scope: string; entries: V2Bookmark[] }) {
  const [buckets, setBuckets] = useState(() => read(scope))
  const [selected, setSelected] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [count, setCount] = useState(5)
  const [message, setMessage] = useState('')
  const [error, setError] = useState(false)
  const [blocked, setBlocked] = useState<Record<string, { signature: string; ids: string[] }>>({})
  const [queries, setQueries] = useState<Record<string, string>>({})
  const [targetSlots, setTargetSlots] = useState<Record<string, number>>({})
  const searchInputs = useRef<Record<string, HTMLInputElement | null>>({})
  const byId = new Map(entries.map(e => [e.bookmark.id, e.bookmark]))
  useEffect(() => {
    const sync = (event: StorageEvent) => { if (event.key === key + scope || event.key === null) setBuckets(read(scope)) }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [scope])
  const save = (next: Bucket[]) => {
    setBuckets(next)
    try { localStorage.setItem(key + scope, JSON.stringify(next)); setError(false) } catch { setError(true) }
  }
  const place = (id: string, bucketId: string, index: number) => {
    if (!byId.has(id)) return
    const target = buckets.find(b => b.id === bucketId)
    if (!target || index < 0 || index >= target.slots.length) { setMessage('Choose an empty slot or add a slot first.'); return }
    if (target.slots[index] && byId.has(target.slots[index]!)) { setMessage('That slot is occupied. Clear it first or choose an empty slot.'); return }
    save(buckets.map(b => ({ ...b, slots: b.slots.map((s, i) => b.id === bucketId && i === index ? id : s === id ? null : s) })))
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
      // Detect blocked tabs before navigating, matching the collection's Open all behavior.
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
      ? `${bucket.name}: your browser blocked ${failed.length} tabs. Allow pop-ups for this site, then use this bucket’s Open remaining button.`
      : `${bucket.name}: all channels opened.`)
  }
  return <section className="bucket-board" aria-label="YouTube buckets">
    <div className="bucket-intro"><span className="eyebrow">✧ Your personal inventory</span><h2>{scope === 'youtube-listen' ? 'The listening grove' : 'The watching tower'}</h2><p>Search your full YouTube library inside any bucket and add a channel directly. No stars needed. Search also lets you move channels between buckets.</p></div>
    <div className="bucket-grid">{buckets.map(bucket => {
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
      <div className="bucket-heading"><span aria-hidden="true">{scope === 'youtube-listen' ? '♫' : '✦'}</span><input aria-label={`Rename ${bucket.name} bucket`} maxLength={60} value={bucket.name} onChange={e => save(buckets.map(b => b.id === bucket.id ? { ...b, name: e.target.value } : b))} /><small>{bucket.slots.filter(id => id && byId.has(id)).length}/{bucket.slots.length}</small></div>
      <button type="button" className="v2-lucky bucket-open" disabled={!bucketEntries(bucket).length}
        aria-label={`${remaining(bucket)?.length ? 'Open remaining' : 'Open all'} in ${bucket.name}`}
        title="Open this bucket’s channels in new tabs, in slot order"
        onClick={() => openBucket(bucket)}>
        {remaining(bucket)?.length ? 'Open remaining' : 'Open all'} ({remaining(bucket)?.length || bucketEntries(bucket).length}) ↗
      </button>
      <div className="bucket-search">
        <label>Find a channel
          <input type="search" aria-label={`Search library for ${bucket.name}`} placeholder="Channel, topic, or #tags…" autoComplete="off"
            ref={input => { searchInputs.current[bucket.id] = input }} value={query}
            onChange={event => setQueries(current => ({ ...current, [bucket.id]: event.target.value }))} />
        </label>
        {query && <button type="button" className="bucket-search-clear" aria-label={`Clear search for ${bucket.name}`} onClick={() => {
          setQueries(current => ({ ...current, [bucket.id]: '' }))
          searchInputs.current[bucket.id]?.focus()
        }}>Clear search</button>}
        {emptySlot < 0 && <p>Bucket full. Add a slot or remove a channel to make room.</p>}
        {!!terms.length && <>
          <p aria-live="polite">{matches.length ? `${matches.length} matching channels` : 'No channels found. Try another name, topic, or tag.'}</p>
          <ul className="bucket-search-results" aria-label={`Library results for ${bucket.name}`}>
            {matches.map(({ bookmark, tags }) => {
              const source = buckets.find(b => b.slots.includes(bookmark.id))
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
        return <li key={index} className={`bucket-slot${bookmark ? ' is-filled' : ''}`} onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }} onDrop={e => { e.preventDefault(); place(e.dataTransfer.getData('text/plain'), bucket.id, index) }}>
          <span className="slot-number">{String(index + 1).padStart(2, '0')}</span>
          {bookmark ? <><button className="slot-channel" draggable onDragStart={e => { e.dataTransfer.setData('text/plain', bookmark.id); setSelected(bookmark.id) }} aria-pressed={selected === bookmark.id} onClick={() => setSelected(selected === bookmark.id ? null : bookmark.id)}>{bookmark.title}</button><a href={bookmark.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${bookmark.title}`}>↗</a><button aria-label={`Remove ${bookmark.title} from ${bucket.name}`} onClick={() => {
            save(buckets.map(b => b.id === bucket.id ? { ...b, slots: b.slots.map((s, i) => i === index ? null : s) } : b))
            if (selected === bookmark.id) setSelected(null)
          }}>×</button></> : <button className="empty-slot" onClick={() => {
            if (selected) place(selected, bucket.id, index)
            else {
              setTargetSlots(current => ({ ...current, [bucket.id]: index }))
              searchInputs.current[bucket.id]?.focus()
              setMessage(`Search for a channel to fill ${bucket.name} slot ${index + 1}.`)
            }
          }} aria-label={`Place selected channel in ${bucket.name} slot ${index + 1}`}>{selected ? '✧ Place here' : '+ Empty slot'}</button>}
        </li>
      })}</ol>
      <div className="bucket-controls"><button disabled={bucket.slots.length >= 20} onClick={() => save(buckets.map(b => b.id === bucket.id ? { ...b, slots: [...b.slots, null] } : b))}>+ Slot</button><button disabled={bucket.slots.length <= 1 || !!bucket.slots.at(-1)} onClick={() => save(buckets.map(b => b.id === bucket.id ? { ...b, slots: b.slots.slice(0, -1) } : b))}>− Empty slot</button><button onClick={() => { save(buckets.filter(b => b.id !== bucket.id)); setSelected(null); setMessage('Bucket removed. Its channels are still in your library.') }}>Delete bucket</button></div>
    </article>})}</div>
    <form className="bucket-create" onSubmit={e => { e.preventDefault(); if (!name.trim()) return; save([...buckets, { id: crypto.randomUUID(), name: name.trim(), slots: Array(count).fill(null) }]); setName('') }}><label>New bucket<input required maxLength={60} value={name} placeholder="Dream up a shelf…" onChange={e => setName(e.target.value)} /></label><label>Slots<select value={count} onChange={e => setCount(Number(e.target.value))}>{Array.from({ length: 20 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}</select></label><button type="submit">+ Create bucket</button></form>
    {!entries.length && <p>Your YouTube library is empty. Add channels to your library to start filling buckets.</p>}
    <p role="status">{error ? 'Browser storage is unavailable. Bucket changes will last until you reload.' : message || 'Saved in this browser · Listen and Watch each have their own shelves.'}</p>
  </section>
}
