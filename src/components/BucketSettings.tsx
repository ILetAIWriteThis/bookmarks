import { useState } from 'react'
import { isChannelLimit, type BucketSettingsData } from '../buckets'

type Props = {
  categories: BucketSettingsData['categories']
  channelLimit: number | null
  onSaveChannelLimit: (limit: number | null) => string | undefined
  onChange: (update: (current: BucketSettingsData) => BucketSettingsData) => void
}

export function BucketSettings({ categories, channelLimit, onSaveChannelLimit, onChange }: Props) {
  const [limitDraft, setLimitDraft] = useState<string | null>(null)
  const [limitError, setLimitError] = useState('')
  const limitValue = limitDraft ?? channelLimit?.toString() ?? ''
  const [editingId, setEditingId] = useState('')
  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const resetForm = () => {
    setEditingId('')
    setName('')
    setDisplayName('')
    setError('')
  }

  return <details className="bucket-settings">
    <summary className="v2-filter-heading">Buckets settings</summary>
    <form className="bucket-create bucket-limit-form" onSubmit={event => {
      event.preventDefault()
      const limit = limitValue === '' ? null : Number(limitValue)
      if (limit !== null && !isChannelLimit(limit)) {
        setLimitError('Enter a positive whole number or leave the field blank.')
        return
      }
      const error = onSaveChannelLimit(limit)
      setLimitError(error ?? '')
      if (!error) setLimitDraft(null)
    }}>
      <label>Max channels per group
        <input type="number" min={1} placeholder="Unlimited" value={limitValue}
          aria-describedby="bucket-channel-limit-hint" onChange={event => {
            setLimitDraft(event.target.value)
            setLimitError('')
          }} />
      </label>
      <button type="submit">Save limit</button>
    </form>
    <p id="bucket-channel-limit-hint">The limit applies to each group across all its buckets. Leave blank for unlimited.</p>
    {limitError && <p role="alert">{limitError}</p>}
    <h3>Channel categories</h3>
    <p>Each channel can have one category across all its buckets. Its display name appears as a hashtag.</p>
    {!!categories.length && <ul className="bucket-settings-categories">
      {categories.map(category => <li key={category.id}>
        <span className="bucket-settings-category"><strong>{category.name}</strong> <span className="bucket-category-label">#{category.displayName}</span></span>
        <button type="button" aria-label={`Edit ${category.name} category`} onClick={() => {
          setEditingId(category.id)
          setName(category.name)
          setDisplayName(category.displayName)
          setError('')
        }}>Edit</button>
        <button type="button" aria-label={`Delete ${category.name} category`} onClick={() => {
          onChange(current => ({
            ...current,
            categories: current.categories.filter(item => item.id !== category.id),
            assignments: Object.fromEntries(Object.entries(current.assignments).filter(([, id]) => id !== category.id)),
          }))
          if (editingId === category.id) resetForm()
        }}>Delete</button>
      </li>)}
    </ul>}
    <form className="bucket-create bucket-category-form" onSubmit={event => {
      event.preventDefault()
      const nextName = name.trim()
      const nextDisplayName = displayName.trim().replace(/^#+\s*/, '').replace(/\s+/g, '-')
      if (!nextName || !nextDisplayName) {
        setError('Enter a name and a display name.')
        return
      }
      onChange(current => {
        if (editingId && !current.categories.some(category => category.id === editingId)) {
          setError('This category was removed. Cancel editing to add a new one.')
          return current
        }
        if (current.categories.some(category => category.id !== editingId && (
          category.name.toLowerCase() === nextName.toLowerCase()
          || category.displayName.toLowerCase() === nextDisplayName.toLowerCase()
        ))) {
          setError('Each category needs a unique name and display name.')
          return current
        }
        const category = { id: editingId || crypto.randomUUID(), name: nextName, displayName: nextDisplayName }
        resetForm()
        return {
          ...current,
          categories: editingId ? current.categories.map(item => item.id === editingId ? category : item) : [...current.categories, category],
        }
      })
    }}>
      <label>Name<input required maxLength={60} value={name} placeholder="Fully checked" onChange={event => setName(event.target.value)} /></label>
      <label>Display name<input required maxLength={16} value={displayName} placeholder="checked" onChange={event => setDisplayName(event.target.value)} /></label>
      <button type="submit">{editingId ? 'Save category' : 'Add category'}</button>
      {editingId && <button type="button" onClick={resetForm}>Cancel</button>}
    </form>
    {error && <p role="alert">{error}</p>}
  </details>
}
