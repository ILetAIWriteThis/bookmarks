import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { BucketBoard } from '../src/components/BucketBoard'
import { AppHeader } from '../src/components/AppHeader'

const entries = ['Alpha', 'Beta'].map((title, i) => ({ bookmark: { id: title, title, url: `https://youtube.com/@${title}`, categories: [] }, position: i + 1, tags: ['listening'] }))
afterEach(() => { cleanup(); vi.restoreAllMocks() })

it('preserves existing buckets in one group and allows a channel once in each new group', () => {
  const original = [
    { id: 'one', name: 'Recurring', slots: ['Alpha', null] },
    { id: 'two', name: 'Good Stories', slots: [null, 'Beta'] },
    { id: 'three', name: 'Favorites', slots: [null] },
  ]
  localStorage.setItem('bookmarks:buckets:v1:youtube-listen', JSON.stringify(original))
  const view = render(<BucketBoard collection="youtube" entries={entries} />)
  const firstGroup = screen.getByRole('region', { name: 'Bucket group My buckets' })
  expect(within(firstGroup).getAllByRole('article')).toHaveLength(3)
  fireEvent.change(screen.getByLabelText('New group'), { target: { value: 'By mood' } })
  fireEvent.click(screen.getByRole('button', { name: '+ Create group' }))
  for (const name of ['Quiet', 'Curious', 'Energetic']) {
    fireEvent.change(screen.getByLabelText('New bucket'), { target: { value: name } })
    fireEvent.click(screen.getByRole('button', { name: '+ Create bucket' }))
  }
  expect(within(screen.getByRole('region', { name: 'Bucket group By mood' })).getAllByRole('article')).toHaveLength(3)
  expect(JSON.parse(localStorage.getItem('bookmarks:buckets:v2:youtube')!)[0].buckets).toEqual(original)
  fireEvent.change(screen.getByRole('searchbox', { name: 'Search library for Quiet' }), { target: { value: 'Alpha' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add Alpha to Quiet' }))
  expect(screen.getByRole('button', { name: 'Added Alpha to Quiet' })).toBeDisabled()
  fireEvent.change(screen.getByRole('searchbox', { name: 'Search library for Curious' }), { target: { value: 'Alpha' } })
  expect(screen.getByRole('button', { name: 'Move Alpha to Curious' })).toHaveTextContent('Move here')
  fireEvent.click(screen.getByRole('button', { name: 'Move Alpha to Curious' }))
  expect(screen.queryByRole('button', { name: 'Remove Alpha from Quiet' })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Remove Alpha from Recurring' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Remove Alpha from Curious' })).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Rename By mood group'), { target: { value: 'A different angle' } })
  view.unmount()
  render(<BucketBoard collection="youtube" entries={entries} />)
  expect(screen.getByRole('region', { name: 'Bucket group A different angle' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Remove Alpha from Recurring' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Remove Alpha from Curious' })).toBeInTheDocument()
})

it('assigns one YouTube category per channel and counts it in every group containing that channel', () => {
  localStorage.setItem('bookmarks:buckets:v2:youtube', JSON.stringify([
    { id: 'first', name: 'First', buckets: [
      { id: 'one', name: 'One', slots: [null] },
      { id: 'another', name: 'Another', slots: ['Beta'] },
    ] },
    { id: 'second', name: 'Second', buckets: [{ id: 'two', name: 'Two', slots: [null] }] },
  ]))
  const initial = render(<BucketBoard collection="youtube" entries={entries} />)
  fireEvent.click(screen.getByText('Buckets settings'))
  for (const [name, displayName] of [['Fully checked', 'checked'], ['Review later', 'later']]) {
    fireEvent.change(screen.getByLabelText('Name', { exact: true }), { target: { value: name } })
    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: displayName } })
    fireEvent.click(screen.getByRole('button', { name: 'Add category' }))
  }
  const checked = screen.getByRole<HTMLOptionElement>('option', { name: 'Fully checked' }).value
  const later = screen.getByRole<HTMLOptionElement>('option', { name: 'Review later' }).value
  fireEvent.change(screen.getByRole('searchbox', { name: 'Search library for One' }), { target: { value: 'Alpha' } })
  fireEvent.change(screen.getByLabelText('Category when adding Alpha to One'), { target: { value: checked } })
  expect(screen.queryByRole('list', { name: 'Category totals for First' })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Add Alpha to One' }))
  const alphaSlot = screen.getByRole('link', { name: 'Alpha' }).closest('li')!
  expect(within(alphaSlot).getByText('#checked')).toBeInTheDocument()

  fireEvent.change(screen.getByLabelText('Category for Beta in Another'), { target: { value: checked } })
  fireEvent.change(screen.getByRole('searchbox', { name: 'Search library for Two' }), { target: { value: '#checked' } })
  expect(screen.getByLabelText('Category when adding Alpha to Two')).toHaveValue(checked)
  fireEvent.click(screen.getByRole('button', { name: 'Add Alpha to Two' }))
  const totals = (group: string) => screen.getByRole('list', { name: `Category totals for ${group}` })
  expect(totals('First')).toHaveTextContent('#checked 2')
  expect(totals('Second')).toHaveTextContent('#checked 1')

  fireEvent.click(screen.getByRole('button', { name: 'Edit Fully checked category' }))
  fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'done' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save category' }))
  initial.unmount()
  const reloaded = render(<BucketBoard collection="youtube" entries={entries} />)
  expect(totals('First')).toHaveTextContent('#done 2')
  expect(totals('Second')).toHaveTextContent('#done 1')
  fireEvent.change(screen.getByLabelText('Category for Alpha in Two'), { target: { value: later } })
  expect(screen.getByLabelText('Category for Alpha in One')).toHaveValue(later)
  expect(totals('First')).toHaveTextContent('#done 1')
  expect(totals('First')).toHaveTextContent('#later 1')
  expect(totals('Second')).toHaveTextContent('#later 1')
  fireEvent.click(screen.getByRole('button', { name: 'Remove Alpha from One' }))
  expect(totals('First')).toHaveTextContent('#done 1')
  expect(totals('First')).not.toHaveTextContent('#later')

  fireEvent.click(screen.getByText('Buckets settings'))
  fireEvent.click(screen.getByRole('button', { name: 'Delete Review later category' }))
  expect(screen.getByLabelText('Category for Alpha in Two')).toHaveValue('')
  expect(screen.queryByRole('list', { name: 'Category totals for Second' })).not.toBeInTheDocument()
  reloaded.unmount()
  render(<BucketBoard collection="web" entries={entries} />)
  expect(screen.queryByText('Buckets settings')).not.toBeInTheDocument()
  expect(screen.queryByRole('list', { name: /^Category totals/ })).not.toBeInTheDocument()
})

it('merges both old YouTube boards without losing groups, duplicate entries across groups, or slot order', () => {
  localStorage.setItem('bookmarks:buckets:v1:youtube-listen', JSON.stringify([
    { id: 'starter-0', name: 'Recurring', slots: [null, 'Alpha'] },
  ]))
  localStorage.setItem('bookmarks:buckets:v2:youtube-watch', JSON.stringify([
    { id: 'starter-group', name: 'My buckets', buckets: [
      { id: 'starter-0', name: 'Next adventures', slots: ['Beta', null, 'Alpha'] },
    ] },
    { id: 'another', name: 'By mood', buckets: [] },
  ]))
  const { unmount } = render(<BucketBoard collection="youtube" entries={entries} />)
  expect(screen.getAllByRole('region', { name: /^Bucket group/ }).map(group => group.getAttribute('aria-label'))).toEqual([
    'Bucket group My buckets', 'Bucket group My buckets (Watch)', 'Bucket group By mood',
  ])
  expect(screen.getAllByRole('link', { name: 'Alpha' })).toHaveLength(2)
  fireEvent.change(screen.getByLabelText('Rename Recurring bucket'), { target: { value: 'Regulars' } })
  unmount()
  render(<BucketBoard collection="youtube" entries={entries} />)
  expect(screen.getByRole('button', { name: 'Remove Alpha from Regulars' })).toBeInTheDocument()
  const saved = JSON.parse(localStorage.getItem('bookmarks:buckets:v2:youtube')!)
  expect(saved.map((group: { buckets: { slots: (string | null)[] }[] }) => group.buckets.map(bucket => bucket.slots))).toEqual([
    [[null, 'Alpha']], [['Beta', null, 'Alpha']], [],
  ])
})

it('copies across groups using selection and drag, while moving only inside the target group', () => {
  localStorage.setItem('bookmarks:buckets:v2:youtube-listen', JSON.stringify([
    { id: 'first', name: 'First', buckets: [{ id: 'one', name: 'One', slots: ['Alpha', null] }] },
    { id: 'second', name: 'Second', buckets: [
      { id: 'two', name: 'Two', slots: [null, null] },
      { id: 'three', name: 'Three', slots: [null, 'Beta'] },
    ] },
  ]))
  render(<BucketBoard collection="youtube" entries={entries} />)
  const first = screen.getByRole('region', { name: 'Bucket group First' })
  fireEvent.click(within(first).getByRole('button', { name: 'Move Alpha' }))
  fireEvent.click(screen.getByRole('button', { name: 'Place selected channel in Two slot 1' }))
  expect(screen.getAllByRole('link', { name: 'Alpha' })).toHaveLength(2)
  fireEvent.click(within(first).getByRole('button', { name: 'Move Alpha' }))
  expect(screen.getAllByRole('button', { name: 'Move Alpha', pressed: true })).toHaveLength(1)
  const transfer = { setData: vi.fn(), getData: () => 'Alpha', effectAllowed: '' }
  fireEvent.dragStart(within(first).getByRole('button', { name: 'Move Alpha' }), { dataTransfer: transfer })
  fireEvent.drop(screen.getByRole('button', { name: 'Place selected channel in Three slot 1' }).closest('li')!, { dataTransfer: transfer })
  expect(screen.getByRole('button', { name: 'Remove Alpha from One' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Remove Alpha from Two' })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Remove Alpha from Three' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Remove Beta from Three' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Remove Alpha from Three' }))
  expect(screen.getByRole('button', { name: 'Remove Alpha from One' })).toBeInTheDocument()
})

it('syncs grouped storage from another tab and recovers from malformed grouped data', () => {
  localStorage.setItem('bookmarks:buckets:v2:youtube-listen', JSON.stringify([{ id: 'bad', name: 'Bad', buckets: null }]))
  render(<BucketBoard collection="youtube" entries={entries} />)
  expect(screen.getByLabelText('Rename Recurring bucket')).toBeInTheDocument()
  localStorage.setItem('bookmarks:buckets:v2:youtube-listen', JSON.stringify([
    { id: 'group', name: 'Synced', buckets: [{ id: 'one', name: 'Elsewhere', slots: ['Alpha'] }] },
  ]))
  fireEvent(window, new StorageEvent('storage', { key: 'bookmarks:buckets:v2:youtube-listen' }))
  expect(screen.getByRole('button', { name: 'Remove Alpha from Elsewhere' })).toBeInTheDocument()
  expect(screen.queryByLabelText('Rename Recurring bucket')).not.toBeInTheDocument()
})

it('searches across names, descriptions, URLs and tags and adds to the chosen slot', () => {
  const library = [{ ...entries[0], bookmark: { ...entries[0].bookmark, title: 'Álpha', description: 'Stories about ancient worlds' }, tags: ['history'] }, entries[1]]
  render(<BucketBoard collection="youtube" entries={library} />)
  fireEvent.click(screen.getByRole('button', { name: 'Place selected channel in Recurring slot 3' }))
  const search = screen.getByRole('searchbox', { name: 'Search library for Recurring' })
  expect(search).toHaveFocus()
  fireEvent.change(search, { target: { value: 'ALPHA ancient #history @Alpha' } })
  const results = screen.getByRole('list', { name: 'Library results for Recurring' })
  expect(within(results).getAllByRole('listitem')).toHaveLength(1)
  fireEvent.click(within(results).getByRole('button', { name: 'Add Álpha to Recurring' }))
  expect(screen.getByRole('button', { name: 'Added Álpha to Recurring' })).toBeDisabled()
  expect(JSON.parse(localStorage.getItem('bookmarks:buckets:v2:youtube')!)[0].buckets[0].slots).toEqual([null, null, 'Alpha', null, null])
  fireEvent.change(search, { target: { value: 'nothing matches' } })
  expect(screen.getByText('No channels found. Try another name, topic, or tag.')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Clear search for Recurring' }))
  expect(search).toHaveValue('')
  expect(search).toHaveFocus()
})

it('moves search results directly between buckets and prevents overfilling', () => {
  localStorage.setItem('bookmarks:buckets:v1:youtube-listen', JSON.stringify([
    { id: 'one', name: 'Recurring', slots: ['Alpha'] },
    { id: 'two', name: 'Good Stories', slots: [null] },
  ]))
  render(<BucketBoard collection="youtube" entries={entries} />)
  fireEvent.change(screen.getByRole('searchbox', { name: 'Search library for Recurring' }), { target: { value: 'Beta' } })
  expect(screen.getByRole('button', { name: 'Add Beta to Recurring' })).toBeDisabled()
  fireEvent.change(screen.getByRole('searchbox', { name: 'Search library for Good Stories' }), { target: { value: 'Alpha' } })
  fireEvent.click(screen.getByRole('button', { name: 'Move Alpha to Good Stories' }))
  expect(screen.queryByRole('button', { name: 'Remove Alpha from Recurring' })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Remove Alpha from Good Stories' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Add Beta to Recurring' })).toBeEnabled()
  fireEvent.click(screen.getByRole('button', { name: 'Add Beta to Recurring' }))
  expect(screen.getByRole('button', { name: 'Remove Beta from Recurring' })).toBeInTheDocument()
})

it('places, moves, and persists channels without replacing occupied slots', () => {
  const { unmount } = render(<BucketBoard collection="youtube" entries={entries} />)
  expect(screen.getAllByText('+ Empty slot')).toHaveLength(10)
  fireEvent.change(screen.getByRole('searchbox', { name: 'Search library for Recurring' }), { target: { value: 'Alpha' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add Alpha to Recurring' }))
  const channel = screen.getByRole('link', { name: 'Alpha' })
  expect(channel).toHaveAttribute('href', 'https://youtube.com/@Alpha')
  expect(channel).toHaveAttribute('target', '_blank')
  expect(channel).toHaveAttribute('rel', 'noopener noreferrer')
  expect(channel).toHaveAttribute('draggable', 'false')
  fireEvent.click(channel)
  const move = screen.getByRole('button', { name: 'Move Alpha' })
  expect(move).toHaveAttribute('aria-pressed', 'false')
  expect(screen.getAllByText('+ Empty slot')).toHaveLength(9)
  fireEvent.click(move)
  expect(move).toHaveAttribute('aria-pressed', 'true')
  fireEvent.click(move)
  expect(move).toHaveAttribute('aria-pressed', 'false')
  fireEvent.click(move)
  fireEvent.click(screen.getByRole('button', { name: 'Place selected channel in Good Stories slot 2' }))
  expect(screen.getByRole('button', { name: 'Place selected channel in Recurring slot 1' })).toBeInTheDocument()
  const slot = screen.getByRole('link', { name: 'Alpha' }).closest('li')!
  fireEvent.drop(slot, { dataTransfer: { getData: () => 'Beta' } })
  expect(screen.getByRole('status')).toHaveTextContent('occupied')
  unmount()
  render(<BucketBoard collection="youtube" entries={entries} />)
  expect(screen.getByRole('button', { name: 'Remove Alpha from Good Stories' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Remove Alpha from Good Stories' }))
  fireEvent.change(screen.getByRole('searchbox', { name: 'Search library for Good Stories' }), { target: { value: 'Alpha' } })
  expect(screen.getByRole('button', { name: 'Add Alpha to Good Stories' })).toBeEnabled()
})
it('creates custom buckets and keeps YouTube separate from Web', () => {
  const { unmount } = render(<BucketBoard collection="youtube" entries={entries} />)
  fireEvent.change(screen.getByLabelText('New bucket'), { target: { value: 'Campfire tales' } })
  fireEvent.change(screen.getByLabelText('Slots'), { target: { value: '3' } })
  fireEvent.click(screen.getByRole('button', { name: '+ Create bucket' }))
  expect(screen.getByLabelText('Rename Campfire tales bucket')).toBeInTheDocument()
  expect(screen.getAllByText('+ Empty slot')).toHaveLength(13)
  unmount()
  render(<BucketBoard collection="web" entries={entries} />)
  expect(screen.queryByLabelText('Rename Campfire tales bucket')).not.toBeInTheDocument()
})
it('recovers from malformed storage and supports drag and drop', () => {
  localStorage.setItem('bookmarks:buckets:v1:youtube-listen', '{broken')
  render(<BucketBoard collection="youtube" entries={entries} />)
  const target = screen.getByRole('button', { name: 'Place selected channel in Recurring slot 1' }).closest('li')!
  fireEvent.drop(target, { dataTransfer: { getData: () => 'Alpha' } })
  expect(screen.getByRole('button', { name: 'Remove Alpha from Recurring' })).toBeInTheDocument()
  const dataTransfer = { setData: vi.fn(), getData: () => 'Alpha', effectAllowed: '' }
  fireEvent.dragStart(screen.getByRole('button', { name: 'Move Alpha' }), { dataTransfer })
  expect(dataTransfer.setData).toHaveBeenCalledWith('text/plain', 'Alpha')
  expect(dataTransfer.effectAllowed).toBe('copyMove')
  fireEvent.drop(screen.getByRole('button', { name: 'Place selected channel in Good Stories slot 1' }).closest('li')!, { dataTransfer })
  expect(screen.getByRole('button', { name: 'Remove Alpha from Good Stories' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Remove Alpha from Recurring' })).not.toBeInTheDocument()
})
it('persists the dark mode toggle', () => {
  render(<AppHeader />)
  fireEvent.click(screen.getByRole('button', { name: 'Dark mode' }))
  expect(document.documentElement.dataset.theme).toBe('dark')
  expect(localStorage.getItem('bookmarks:theme')).toBe('dark')
})

it('opens only the bucket channels and retries only blocked tabs', () => {
  localStorage.setItem('bookmarks:buckets:v1:youtube-listen', JSON.stringify([
    { id: 'one', name: 'Recurring', slots: ['Beta', null, 'Alpha'] },
    { id: 'two', name: 'Stories', slots: [null] },
  ]))
  const links: string[] = []
  const tab = { opener: window, document: {
    createElement: () => { const link = { href: '', rel: '', referrerPolicy: '', click: () => links.push(link.href) }; return link },
    body: { append: () => undefined },
  } }
  const open = vi.spyOn(window, 'open').mockReturnValueOnce(tab as unknown as Window).mockReturnValueOnce(null).mockReturnValue(tab as unknown as Window)
  render(<BucketBoard collection="youtube" entries={entries} />)
  expect(screen.getByRole('button', { name: 'Open all in Stories' })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: 'Open all in Recurring' }))
  expect(open).toHaveBeenCalledTimes(2)
  expect(links).toEqual(['https://youtube.com/@Beta'])
  fireEvent.click(screen.getByRole('button', { name: 'Open remaining in Recurring' }))
  expect(links).toEqual(['https://youtube.com/@Beta', 'https://youtube.com/@Alpha'])
  fireEvent.click(screen.getByRole('button', { name: 'Open all in Recurring' }))
  expect(links).toEqual(['https://youtube.com/@Beta', 'https://youtube.com/@Alpha', 'https://youtube.com/@Beta', 'https://youtube.com/@Alpha'])
})
