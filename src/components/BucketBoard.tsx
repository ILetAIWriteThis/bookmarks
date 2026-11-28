import { useEffect, useMemo, useRef, useState } from 'react'
import { bucketStorageKey, isBucketStorageKey, readBuckets, type Bucket } from '../buckets'
import { normalizeSearch } from '../data'
import type { Bookmark } from '../types'
import type { V2Bookmark, V2Collection } from '../v2'

export function BucketBoard({ collection, entries }: { collection: V2Collection; entries: V2Bookmark[] }) {
  const byId = useMemo(() => new Map(entries.map(({ bookmark }) => [bookmark.id, bookmark])), [entries])
  const [buckets, setBuckets] = useState(() => readBuckets(collection, byId))
  const title = collection === 'youtube' ? 'YouTube buckets' : 'Web buckets'
  const item = collection === 'youtube' ? 'channel' : 'bookmark'
  const [selected, setSelected] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState(false)
  const [blocked, setBlocked] = useState<Record<number, { signature: string; ids: string[] }>>({})
  const [queries, setQueries] = useState<Record<number, string>>({})
  const [targetSlots, setTargetSlots] = useState<Record<number, number>>({})
  const searchInputs = useRef<Record<number, HTMLInputElement | null>>({})

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (isBucketStorageKey(event.key, collection)) {
        setBuckets(readBuckets(collection, byId))
        setSelected(null)
        setError(false)
      }
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [byId, collection])

  const currentBuckets = () => error ? buckets : readBuckets(collection, byId)
  const saveBuckets = (next: Bucket[]) => {
    setBuckets(next)
    try {
      localStorage.setItem(bucketStorageKey(collection), JSON.stringify(next))
      setError(false)
    } catch {
      setError(true)
    }
  }

  const place = (id: string, targetIndex: number, slotIndex: number, allowSwap = false) => {
    const bookmark = byId.get(id)
    if (!bookmark) return
    const current = currentBuckets()
    const target = current[targetIndex]
    const targetId = target.slots[slotIndex]
    if (targetId === id) {
      setSelected(null)
      return
    }
    const occupant = targetId && byId.has(targetId) ? targetId : null
    if (occupant && (!allowSwap || !current.some(bucket => bucket.slots.includes(id)))) {
      setMessage('That slot is occupied. Clear it first or choose an empty slot.')
      return
    }

    saveBuckets(current.map((bucket, index) => ({
      ...bucket,
      slots: bucket.slots.map((slot, i) => index === targetIndex && i === slotIndex ? id : slot === id ? occupant : slot),
    })))
    setSelected(null)
    setMessage(occupant
      ? `${bookmark.title} swapped slots with ${byId.get(occupant)?.title}.`
      : `${bookmark.title} placed in ${target.name}.`)
  }

  const updateBucket = (bucketIndex: number, update: (bucket: Bucket) => Bucket) => {
    saveBuckets(currentBuckets().map((bucket, index) => index === bucketIndex ? update(bucket) : bucket))
  }

  const remove = (id: string, bucketIndex: number, slotIndex: number) => {
    updateBucket(bucketIndex, bucket => ({
      ...bucket,
      slots: bucket.slots.map((slot, i) => i === slotIndex && slot === id ? null : slot),
    }))
    if (selected === id) setSelected(null)
    setMessage(`${byId.get(id)?.title} removed.`)
  }

  const openBucket = (bucketIndex: number, bookmarks: Bookmark[], signature: string, pending?: string[]) => {
    const failed: string[] = []
    // Firefox can insert each new tab next to the bucket tab, ahead of the previous one.
    const openingOrder = navigator.userAgent.includes('Firefox/') ? [...bookmarks].reverse() : bookmarks
    for (const bookmark of openingOrder) {
      if (pending?.length && !pending.includes(bookmark.id)) continue
      // Opening a blank tab first lets us distinguish blocking from a tab with no opener.
      const tab = window.open('about:blank', '_blank')
      if (!tab) {
        failed.push(bookmark.id)
        continue
      }
      tab.opener = null
      const link = tab.document.createElement('a')
      link.href = bookmark.url
      link.rel = 'noopener noreferrer'
      link.referrerPolicy = 'no-referrer'
      tab.document.body.append(link)
      link.click()
    }
    setBlocked(current => ({ ...current, [bucketIndex]: { signature, ids: failed } }))
    const { name } = buckets[bucketIndex]
    setMessage(failed.length
      ? `${name}: your browser blocked ${failed.length} ${failed.length === 1 ? 'tab' : 'tabs'}. Allow pop-ups for this site, then use this bucket’s Open remaining button.`
      : `${name}: all ${item}s opened.`)
  }

  return <section className="bucket-board" aria-labelledby="bucket-title">
    <h2 id="bucket-title">{title}</h2>
    <div className="bucket-grid">{buckets.map((bucket, bucketIndex) => {
      const bookmarks = bucket.slots.map(id => id === null ? undefined : byId.get(id))
      const filled = bookmarks.filter(bookmark => bookmark !== undefined)
      const signature = JSON.stringify(filled.map(({ id, url }) => [id, url]))
      const pending = blocked[bucketIndex]?.signature === signature ? blocked[bucketIndex].ids : undefined
      const openLabel = pending?.length ? 'Open remaining' : 'Open all'
      const query = queries[bucketIndex] ?? ''
      const terms = normalizeSearch(query).split(/\s+/).map(term => term.replace(/^#/, '')).filter(Boolean)
      const matches = terms.length ? entries.filter(({ bookmark, tags }) => {
        const text = normalizeSearch([bookmark.title, bookmark.description, bookmark.url, ...tags].join(' '))
        return terms.every(term => text.includes(term))
      }) : []
      const requestedSlot = targetSlots[bucketIndex]
      const emptySlot = requestedSlot !== undefined && !bookmarks[requestedSlot]
        ? requestedSlot : bookmarks.findIndex(bookmark => !bookmark)
      return <article className="bucket" key={bucketIndex} aria-label={bucket.name}>
        <div className="bucket-heading">
          <input key={bucket.name} aria-label={`Rename bucket ${bucketIndex + 1}`} defaultValue={bucket.name}
            maxLength={60} onBlur={event => {
              const input = event.currentTarget
              const name = input.value.trim() || bucket.name
              input.value = name
              if (name !== bucket.name) updateBucket(bucketIndex, current => ({ ...current, name }))
            }}
            onKeyDown={event => {
              if (event.key === 'Enter' && !event.nativeEvent.isComposing) event.currentTarget.blur()
            }} />
          <small>{filled.length}/{bucket.slots.length}</small>
        </div>
        <button type="button" className="v2-lucky bucket-open" disabled={!filled.length}
          aria-label={`${openLabel} in ${bucket.name}`} title={`Open ${item}s in new tabs, in slot order`}
          onClick={() => openBucket(bucketIndex, filled, signature, pending)}>
          {openLabel} ({pending?.length || filled.length}) ↗
        </button>
        <div className="bucket-search">
          <label>Find a {item}
            <input type="search" aria-label={`Search library for ${bucket.name}`} placeholder={`${item === 'channel' ? 'Channel' : 'Title'}, topic, or #tags…`} autoComplete="off"
              ref={input => { searchInputs.current[bucketIndex] = input }} value={query}
              onChange={event => setQueries(current => ({ ...current, [bucketIndex]: event.target.value }))} />
          </label>
          {query && <button type="button" className="bucket-search-clear" aria-label={`Clear search for ${bucket.name}`} onClick={() => {
            setQueries(current => ({ ...current, [bucketIndex]: '' }))
            searchInputs.current[bucketIndex]?.focus()
          }}>Clear search</button>}
          {emptySlot < 0 && <p>Bucket full. Remove a {item} to make room.</p>}
          {!!terms.length && <>
            <p aria-live="polite">{matches.length ? `${matches.length} matching ${item}${matches.length === 1 ? '' : 's'}` : `No ${item}s found. Try another name, topic, or tag.`}</p>
            <ul className="bucket-search-results" aria-label={`Library results for ${bucket.name}`}>
              {matches.map(({ bookmark, tags }) => {
                const source = buckets.find(other => other.slots.includes(bookmark.id))
                const added = source === bucket
                return <li key={bookmark.id}>
                  <div>
                    <strong>{bookmark.title}</strong>
                    {bookmark.description && <p>{bookmark.description}</p>}
                    {!!tags.length && <small>{tags.map(tag => `#${tag}`).join(' ')}</small>}
                    {source && !added && <small>In {source.name}</small>}
                  </div>
                  <button type="button" disabled={added || emptySlot < 0}
                    aria-label={`${added ? 'Added' : source ? 'Move' : 'Add'} ${bookmark.title} to ${bucket.name}`}
                    onClick={() => place(bookmark.id, bucketIndex, emptySlot)}>
                    {added ? 'Added' : source ? 'Move here' : 'Add'}
                  </button>
                </li>
              })}
            </ul>
          </>}
        </div>
        <ol className="bucket-slots">{bookmarks.map((bookmark, index) => (
          <li key={index} className={`bucket-slot${bookmark ? ' is-filled' : ''}`}
            onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = selected ? 'move' : 'copy' }}
            onDrop={event => { event.preventDefault(); place(event.dataTransfer.getData('text/plain'), bucketIndex, index, true) }}>
            <span className="slot-number">{String(index + 1).padStart(2, '0')}</span>
            {bookmark ? <>
              <a className="slot-title" href={bookmark.url} target="_blank" rel="noopener noreferrer" draggable={false}>{bookmark.title}</a>
              <button type="button" className="slot-drag" draggable aria-label={`Move ${bookmark.title}`}
                aria-pressed={selected === bookmark.id} title="Drag to move or swap slots"
                onDragStart={event => {
                  event.dataTransfer.effectAllowed = 'move'
                  event.dataTransfer.setData('text/plain', bookmark.id)
                  setSelected(bookmark.id)
                }}
                onDragEnd={() => setSelected(null)}
                onClick={() => setSelected(selected === bookmark.id ? null : bookmark.id)}>⠿</button>
              <button type="button" aria-label={`Remove ${bookmark.title} from ${bucket.name}`}
                onClick={() => remove(bookmark.id, bucketIndex, index)}>×</button>
            </> : <button type="button" className="empty-slot" onClick={() => {
              if (selected) place(selected, bucketIndex, index)
              else {
                setTargetSlots(current => ({ ...current, [bucketIndex]: index }))
                searchInputs.current[bucketIndex]?.focus()
                setMessage(`Search for a ${item} to fill ${bucket.name} slot ${index + 1}.`)
              }
            }} aria-label={`${selected ? `Place selected ${item} in` : 'Fill'} ${bucket.name} slot ${index + 1}`}>
              {selected ? '✧ Place here' : '+ Empty slot'}
            </button>}
          </li>
        ))}</ol>
      </article>
    })}</div>
    {!entries.length && <p>Your {collection === 'youtube' ? 'YouTube' : 'Web'} library is empty.</p>}
    <p role="status">{error ? 'Browser storage is unavailable. Unsaved changes will last until you reload.' : message}</p>
  </section>
}
