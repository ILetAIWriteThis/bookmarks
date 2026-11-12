import { useEffect, useState } from 'react'
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
    if (!target || (target.slots[index] && byId.has(target.slots[index]!))) { setMessage('That slot is occupied. Clear it first or choose an empty slot.'); return }
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
  const assigned = new Set(buckets.flatMap(b => b.slots))
  return <section className="bucket-board" aria-label="YouTube buckets">
    <div className="bucket-intro"><span className="eyebrow">✧ Your personal inventory</span><h2>{scope === 'youtube-listen' ? 'The listening grove' : 'The watching tower'}</h2><p>Small shelves. Great adventures. Drag a channel into a slot, or select a channel and tap an empty slot.</p></div>
    <div className="bucket-grid">{buckets.map(bucket => <article className="bucket" key={bucket.id}>
      <div className="bucket-heading"><span aria-hidden="true">{scope === 'youtube-listen' ? '♫' : '✦'}</span><input aria-label={`Rename ${bucket.name} bucket`} maxLength={60} value={bucket.name} onChange={e => save(buckets.map(b => b.id === bucket.id ? { ...b, name: e.target.value } : b))} /><small>{bucket.slots.filter(id => id && byId.has(id)).length}/{bucket.slots.length}</small></div>
      <button type="button" className="v2-lucky bucket-open" disabled={!bucketEntries(bucket).length}
        aria-label={`${remaining(bucket)?.length ? 'Open remaining' : 'Open all'} in ${bucket.name}`}
        title="Open this bucket’s channels in new tabs, in slot order"
        onClick={() => openBucket(bucket)}>
        {remaining(bucket)?.length ? 'Open remaining' : 'Open all'} ({remaining(bucket)?.length || bucketEntries(bucket).length}) ↗
      </button>
      <ol className="bucket-slots">{bucket.slots.map((id, index) => {
        const bookmark = id ? byId.get(id) : undefined
        return <li key={index} className={`bucket-slot${bookmark ? ' is-filled' : ''}`} onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }} onDrop={e => { e.preventDefault(); place(e.dataTransfer.getData('text/plain'), bucket.id, index) }}>
          <span className="slot-number">{String(index + 1).padStart(2, '0')}</span>
          {bookmark ? <><button className="slot-channel" draggable onDragStart={e => { e.dataTransfer.setData('text/plain', bookmark.id); setSelected(bookmark.id) }} aria-pressed={selected === bookmark.id} onClick={() => setSelected(selected === bookmark.id ? null : bookmark.id)}>{bookmark.title}</button><a href={bookmark.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${bookmark.title}`}>↗</a><button aria-label={`Remove ${bookmark.title} from ${bucket.name}`} onClick={() => save(buckets.map(b => b.id === bucket.id ? { ...b, slots: b.slots.map((s, i) => i === index ? null : s) } : b))}>×</button></> : <button className="empty-slot" onClick={() => selected ? place(selected, bucket.id, index) : setMessage('Select a channel from the tray first.')} aria-label={`Place selected channel in ${bucket.name} slot ${index + 1}`}>{selected ? '✧ Place here' : '+ Empty slot'}</button>}
        </li>
      })}</ol>
      <div className="bucket-controls"><button disabled={bucket.slots.length >= 20} onClick={() => save(buckets.map(b => b.id === bucket.id ? { ...b, slots: [...b.slots, null] } : b))}>+ Slot</button><button disabled={bucket.slots.length <= 1 || !!bucket.slots.at(-1)} onClick={() => save(buckets.map(b => b.id === bucket.id ? { ...b, slots: b.slots.slice(0, -1) } : b))}>− Empty slot</button><button onClick={() => { save(buckets.filter(b => b.id !== bucket.id)); setMessage('Bucket removed. Its channels are available in the tray.') }}>Delete bucket</button></div>
    </article>)}</div>
    <form className="bucket-create" onSubmit={e => { e.preventDefault(); if (!name.trim()) return; save([...buckets, { id: crypto.randomUUID(), name: name.trim(), slots: Array(count).fill(null) }]); setName('') }}><label>New bucket<input required maxLength={60} value={name} placeholder="Dream up a shelf…" onChange={e => setName(e.target.value)} /></label><label>Slots<select value={count} onChange={e => setCount(Number(e.target.value))}>{Array.from({ length: 20 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}</select></label><button type="submit">+ Create bucket</button></form>
    <div className="bucket-tray"><h3>Unsorted treasures <span>· {entries.filter(e => !assigned.has(e.bookmark.id)).length}</span></h3><p>Pick up a channel. Give it a home.</p><div>{entries.filter(e => !assigned.has(e.bookmark.id)).map(({ bookmark }) => <button key={bookmark.id} draggable aria-pressed={selected === bookmark.id} onDragStart={e => { e.dataTransfer.setData('text/plain', bookmark.id); setSelected(bookmark.id) }} onClick={() => setSelected(selected === bookmark.id ? null : bookmark.id)}>⠿ {bookmark.title}</button>)}</div>{!entries.length && <p>Star some YouTube channels to begin your collection.</p>}</div>
    <p role="status">{error ? 'Browser storage is unavailable. Bucket changes will last until you reload.' : message || 'Saved in this browser · Listen and Watch each have their own shelves.'}</p>
  </section>
}
