import { createHash } from 'node:crypto'
import { readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { bookmarksForCategory, bookmarksForCategoryTree, childCategories, validateBookmarkData } from '../src/data'
import { validateMediaData, type MediaEntry } from '../src/media'
import { placeBookmark, removePlacement } from '../src/placement'
import type { Bookmark, BookmarkData, Category, CategoryMembership } from '../src/types'

const dataPath = resolve(process.cwd(), 'public/data/bookmarks.json')
const checksumPath = resolve(process.cwd(), 'public/data/bookmarks.sha256')
const mediaPath = resolve(process.cwd(), 'public/data/media.json')

type Flags = Map<string, string[]>

function usage() {
  console.log(`Bookmark data manager

Usage:
  npm run bookmarks -- list [--category ID] [--collection old|web|youtube]
  npm run bookmarks -- check
  npm run bookmarks -- add-media --id ID --kind book|movie|tv --title TITLE --creator NAME --published YEAR --added-on DATE [options]
  npm run bookmarks -- update-media --id ID --completed-date DATE
  npm run bookmarks -- update-media --id ID --set-completed-date DATE
  npm run bookmarks -- import-media --file JSON_FILE
  npm run bookmarks -- export-markdown --file MARKDOWN_FILE
  npm run bookmarks -- upsert-bookmarks --file JSON_FILE
  npm run bookmarks -- add-category --id ID --name NAME --position N [--icon NAME] [--parent ID]
  npm run bookmarks -- update-category --id ID [--name NAME] [--position N] [--icon NAME] [--parent ID]
  npm run bookmarks -- remove-category --id ID
  npm run bookmarks -- add-bookmark --id ID --title TITLE --url HTTPS_URL [options]
  npm run bookmarks -- update-bookmark --id ID [options]
  npm run bookmarks -- promote-bookmark --id ID --collection web|youtube --position N
  npm run bookmarks -- demote-bookmark --id ID
  npm run bookmarks -- remove-bookmark --id ID

Bookmark options:
  --description TEXT
  --tag TAG                 Repeat for multiple tags
  --category ID:POSITION    Repeat for multiple category assignments
  --daily-position N
  --clear-daily             update-bookmark only
  --subscribed              Mark a YouTube channel as subscribed
  --not-subscribed          Mark a YouTube channel as not subscribed
  --collection web|youtube --position N
                             Add directly to a reviewed collection; later positions shift
Media options (add-media):
  --creator NAME             Repeat for multiple creators
  --genre NAME               Repeat for multiple genres
  --completed-date DATE      Repeat for each read or watch date
  --universe NAME --url HTTPS_URL
Media options (update-media):
  --completed-date DATE      Append a read or watch date; repeat for multiple dates
  --set-completed-date DATE  Replace read or watch dates; repeat for multiple dates
Media import:
  --file JSON_FILE           JSON object with an entries array; adds validated entries atomically
Category options:
  --parent ID               Nest below an existing category
  --clear-parent            Move an existing category to the root

Theme options (category commands; provide all three together):
  --from COLOR --to COLOR --accent COLOR

Examples:
  npm run bookmarks -- export-markdown --file /tmp/bookmarks.md
  npm run bookmarks -- add-media --id the-avengers-2012 --kind movie --title "The Avengers" --creator "Joss Whedon" --published 2012 --added-on 2026-09-23 --completed-date 2016-07-01 --completed-date 2026-09-19 --genre Action --universe "Marvel Cinematic Universe" --url https://www.imdb.com/title/tt0848228/
  npm run bookmarks -- add-bookmark --id example --title "Example" --url https://example.com --category news:1 --category tech-ai:3 --daily-position 1
  npm run bookmarks -- update-bookmark --id example --tag reference --tag daily --clear-daily
  npm run bookmarks -- promote-bookmark --id example --collection web --position 1
  npm run bookmarks -- demote-bookmark --id example
  npm run bookmarks -- list --category news`)
}

function parseFlags(args: string[]): Flags {
  const flags: Flags = new Map()
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index]
    if (!token.startsWith('--')) throw new Error(`Unexpected argument "${token}"`)
    const name = token.slice(2)
    if (name === 'clear-daily' || name === 'clear-parent' || name === 'subscribed' || name === 'not-subscribed') {
      flags.set(name, ['true'])
      continue
    }
    const value = args[index + 1]
    if (value === undefined || value.startsWith('--')) throw new Error(`--${name} requires a value`)
    flags.set(name, [...(flags.get(name) ?? []), value])
    index += 1
  }
  return flags
}

const has = (flags: Flags, name: string) => flags.has(name)
const optional = (flags: Flags, name: string) => flags.get(name)?.at(-1)
const required = (flags: Flags, name: string) => {
  const value = optional(flags, name)
  if (!value) throw new Error(`Missing required option --${name}`)
  return value
}
const numberValue = (value: string, name: string) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) throw new Error(`--${name} must be a finite number`)
  return parsed
}
const optionalNumber = (flags: Flags, name: string) => {
  const value = optional(flags, name)
  return value === undefined ? undefined : numberValue(value, name)
}

function checksum(source: string) {
  return createHash('sha256').update(source).digest('hex')
}

async function readManagedData(): Promise<BookmarkData> {
  const [source, expected] = await Promise.all([readFile(dataPath, 'utf8'), readFile(checksumPath, 'utf8')])
  if (checksum(source) !== expected.trim()) {
    throw new Error('Managed data checksum does not match. Restore direct edits, then make the change through this CLI.')
  }
  return validateBookmarkData(JSON.parse(source) as unknown)
}

async function writeManagedData(data: BookmarkData) {
  const valid = validateBookmarkData(data)
  const source = `${JSON.stringify(valid, null, 2)}\n`
  const dataTemp = resolve(dirname(dataPath), '.bookmarks.json.tmp')
  const checksumTemp = resolve(dirname(checksumPath), '.bookmarks.sha256.tmp')
  await writeFile(dataTemp, source, 'utf8')
  await writeFile(checksumTemp, `${checksum(source)}\n`, 'utf8')
  await rename(dataTemp, dataPath)
  await rename(checksumTemp, checksumPath)
  console.log(`Updated ${dataPath}`)
}

function parseMemberships(flags: Flags): CategoryMembership[] | undefined {
  const values = flags.get('category')
  if (!values) return undefined
  return values.map((value) => {
    const separator = value.lastIndexOf(':')
    if (separator < 1) throw new Error(`--category must use ID:POSITION; received "${value}"`)
    return { categoryId: value.slice(0, separator), position: numberValue(value.slice(separator + 1), 'category position') }
  })
}

function parseTags(flags: Flags) {
  return flags.get('tag')?.flatMap((tag) => tag.split(',')).map((tag) => tag.trim()).filter(Boolean)
}

function placementPosition(flags: Flags) {
  const position = numberValue(required(flags, 'position'), 'position')
  if (!Number.isSafeInteger(position) || position < 0) throw new Error('--position must be a non-negative safe integer')
  return position
}

function applySubscription(bookmark: Bookmark, flags: Flags) {
  if (has(flags, "subscribed") && has(flags, "not-subscribed")) {
    throw new Error("Use either --subscribed or --not-subscribed, not both")
  }
  if (has(flags, "subscribed")) bookmark.subscribed = true
  if (has(flags, "not-subscribed")) bookmark.subscribed = false
}

function applyTheme(category: Category, flags: Flags) {
  const values = [optional(flags, 'from'), optional(flags, 'to'), optional(flags, 'accent')]
  if (values.some(Boolean) && !values.every(Boolean)) throw new Error('Theme changes require --from, --to, and --accent together')
  if (values.every(Boolean)) category.theme = { from: values[0]!, to: values[1]!, accent: values[2]! }
}

function printCategoryTree(categories: Category[], parentId?: string, depth = 0) {
  childCategories(categories, parentId).forEach((category) => {
    console.log('  '.repeat(depth + 1) + category.position + '	' + category.id + '	' + category.name)
    printCategoryTree(categories, category.id, depth + 1)
  })
}

function markdownLink(bookmark: Bookmark) {
  const title = bookmark.title.replaceAll('\\', '\\\\').replaceAll(']', '\\]').replace(/\s+/g, ' ')
  return `- [${title}](<${bookmark.url}>)`
}

function appendCategoryMarkdown(lines: string[], data: BookmarkData, parentId?: string, depth = 0) {
  childCategories(data.categories, parentId).forEach((category) => {
    lines.push(`${'#'.repeat(depth + 1)} ${category.name}`, '')
    bookmarksForCategory(data.bookmarks, category.id).forEach((bookmark) => lines.push(markdownLink(bookmark)))
    if (lines.at(-1) !== '') lines.push('')
    appendCategoryMarkdown(lines, data, category.id, depth + 1)
  })
}

function exportMarkdown(data: BookmarkData) {
  const lines: string[] = []
  appendCategoryMarkdown(lines, data)

  const uncategorized = data.bookmarks
    .filter((bookmark) => bookmark.categories.length === 0)
    .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }))
  if (uncategorized.length) {
    lines.push('# Uncategorized', '')
    uncategorized.forEach((bookmark) => lines.push(markdownLink(bookmark)))
    lines.push('')
  }

  return lines.join('\n')
}

async function writeMediaData(entries: MediaEntry[]) {
  const valid = validateMediaData({ entries })
  const temp = resolve(dirname(mediaPath), '.media.json.tmp')
  await writeFile(temp, `${JSON.stringify(valid, null, 2)}\n`, 'utf8')
  await rename(temp, mediaPath)
  console.log(`Updated ${mediaPath}`)
}

async function run() {
  const [command = 'help', ...args] = process.argv.slice(2)
  if (command === 'help' || command === '--help' || command === '-h') return usage()
  const flags = parseFlags(args)
  if (command === 'add-media') {
    const kind = required(flags, 'kind')
    if (kind !== 'book' && kind !== 'movie' && kind !== 'tv') throw new Error('--kind must be book, movie, or tv')
    const entry: MediaEntry = {
      id: required(flags, 'id'), kind, title: required(flags, 'title'),
      creators: flags.get('creator') ?? [], published: required(flags, 'published'),
      addedOn: required(flags, 'added-on'), genres: flags.get('genre') ?? [],
    }
    if (has(flags, 'completed-date')) entry.completedDates = flags.get('completed-date')
    if (has(flags, 'universe')) entry.universe = required(flags, 'universe')
    if (has(flags, 'url')) entry.url = required(flags, 'url')
    const existing = validateMediaData(JSON.parse(await readFile(mediaPath, 'utf8')) as unknown)
    await writeMediaData([...existing.entries, entry])
    return
  }
  if (command === 'update-media') {
    const dates = flags.get('completed-date')
    const replacementDates = flags.get('set-completed-date')
    if (!dates?.length && !replacementDates?.length) throw new Error('Provide --completed-date or --set-completed-date')
    if (dates?.length && replacementDates?.length) throw new Error('Use either --completed-date or --set-completed-date')
    const existing = validateMediaData(JSON.parse(await readFile(mediaPath, 'utf8')) as unknown)
    const entry = existing.entries.find((item) => item.id === required(flags, 'id'))
    if (!entry) throw new Error(`Unknown library id: ${required(flags, 'id')}`)
    entry.completedDates = replacementDates ?? [...(entry.completedDates ?? []), ...dates!]
    await writeMediaData(existing.entries)
    return
  }
  if (command === 'import-media') {
    const incoming = validateMediaData(JSON.parse(await readFile(resolve(required(flags, 'file')), 'utf8')) as unknown)
    const existing = validateMediaData(JSON.parse(await readFile(mediaPath, 'utf8')) as unknown)
    const existingUrls = new Set(existing.entries.map((entry) => entry.url).filter(Boolean))
    for (const entry of incoming.entries) {
      if (!entry.url) continue
      if (existingUrls.has(entry.url)) throw new Error(`Library source already exists: ${entry.url}`)
      existingUrls.add(entry.url)
    }
    await writeMediaData([...existing.entries, ...incoming.entries])
    console.log(`Imported ${incoming.entries.length} media entries.`)
    return
  }
  const data = await readManagedData()

  if (command === 'check') {
    console.log(`Managed bookmark data is valid: ${data.categories.length} categories, ${data.bookmarks.length} bookmarks.`)
    return
  }
  if (command === 'list') {
    const categoryId = optional(flags, 'category')
    const collection = optional(flags, 'collection')
    if (collection && !['old', 'web', 'youtube'].includes(collection)) {
      throw new Error('--collection must be old, web, or youtube')
    }
    const inCategory = categoryId ? bookmarksForCategoryTree(data, categoryId) : data.bookmarks
    const bookmarks = collection === 'old' ? inCategory.filter((bookmark) => !bookmark.placement)
      : collection ? inCategory.filter((bookmark) => bookmark.placement?.collection === collection) : inCategory
    if (collection === 'web' || collection === 'youtube') {
      bookmarks.sort((a, b) => a.placement!.position - b.placement!.position)
    }
    console.log(`${data.categories.length} categories`)
    printCategoryTree(data.categories)
    console.log(`${bookmarks.length} bookmarks${categoryId ? ` in ${categoryId}` : ''}${collection ? ` in ${collection}` : ''}`)
    bookmarks.forEach((bookmark) => console.log(`  ${collection === 'web' || collection === 'youtube' ? `${bookmark.placement!.position}\t` : ''}${bookmark.id}\t${bookmark.title}\t${bookmark.url}`))
    return
  }
  if (command === 'export-markdown') {
    const outputPath = resolve(process.cwd(), required(flags, 'file'))
    if (outputPath === dataPath || outputPath === checksumPath) {
      throw new Error('Markdown export cannot overwrite managed bookmark data files')
    }
    await writeFile(outputPath, exportMarkdown(data), 'utf8')
    console.log(`Exported ${data.bookmarks.length} bookmarks to ${outputPath}`)
    return
  }

  if (command === 'upsert-bookmarks') {
    const importPath = resolve(process.cwd(), required(flags, 'file'))
    const importedValue = JSON.parse(await readFile(importPath, 'utf8')) as { bookmarks?: unknown }
    if (!Array.isArray(importedValue.bookmarks)) {
      throw new Error('Import file must contain a "bookmarks" array')
    }
    const imported = validateBookmarkData({ categories: data.categories, bookmarks: importedValue.bookmarks }).bookmarks
    const existing = new Map(data.bookmarks.map((bookmark) => [bookmark.id, bookmark]))
    imported.forEach((bookmark) => {
      if (!bookmark.placement) bookmark.placement = existing.get(bookmark.id)?.placement
    })
    const importedIds = new Set(imported.map(({ id }) => id))
    data.bookmarks = [...data.bookmarks.filter(({ id }) => !importedIds.has(id)), ...imported]
  } else if (command === 'add-category') {
    const category: Category = {
      id: required(flags, 'id'), name: required(flags, 'name'), position: numberValue(required(flags, 'position'), 'position'),
    }
    if (has(flags, 'icon')) category.icon = required(flags, 'icon')
    if (has(flags, 'parent')) category.parentId = required(flags, 'parent')
    applyTheme(category, flags)
    data.categories.push(category)
  } else if (command === 'update-category') {
    const category = data.categories.find(({ id }) => id === required(flags, 'id'))
    if (!category) throw new Error(`Category "${required(flags, 'id')}" does not exist`)
    if (has(flags, 'name')) category.name = required(flags, 'name')
    if (has(flags, 'position')) category.position = numberValue(required(flags, 'position'), 'position')
    if (has(flags, 'icon')) category.icon = required(flags, 'icon')
    if (has(flags, 'parent')) category.parentId = required(flags, 'parent')
    if (has(flags, 'clear-parent')) delete category.parentId
    applyTheme(category, flags)
  } else if (command === 'remove-category') {
    const id = required(flags, 'id')
    if (data.categories.some((category) => category.parentId === id)) {
      throw new Error(`Category "${id}" still has child categories; move or remove those children first`)
    }
    if (data.bookmarks.some((bookmark) => bookmark.categories.some((item) => item.categoryId === id))) {
      throw new Error(`Category "${id}" is still assigned to bookmarks; update those bookmarks first`)
    }
    const before = data.categories.length
    data.categories = data.categories.filter((category) => category.id !== id)
    if (data.categories.length === before) throw new Error(`Category "${id}" does not exist`)
  } else if (command === 'add-bookmark') {
    const bookmark: Bookmark = {
      id: required(flags, 'id'), title: required(flags, 'title'), url: required(flags, 'url'),
      categories: parseMemberships(flags) ?? [],
    }
    if (has(flags, 'description')) bookmark.description = required(flags, 'description')
    if (has(flags, 'tag')) bookmark.tags = parseTags(flags)
    if (has(flags, 'daily-position')) bookmark.dailyPosition = optionalNumber(flags, 'daily-position')
    applySubscription(bookmark, flags)
    if (has(flags, 'collection') !== has(flags, 'position')) {
      throw new Error('Adding to a reviewed collection requires both --collection and --position')
    }
    if (has(flags, 'collection')) {
      const collection = required(flags, 'collection')
      if (collection !== 'web' && collection !== 'youtube') throw new Error('--collection must be web or youtube')
      placeBookmark(data, bookmark, collection, placementPosition(flags))
    }
    data.bookmarks.push(bookmark)
  } else if (command === 'update-bookmark') {
    const bookmark = data.bookmarks.find(({ id }) => id === required(flags, 'id'))
    if (!bookmark) throw new Error(`Bookmark "${required(flags, 'id')}" does not exist`)
    if (has(flags, 'title')) bookmark.title = required(flags, 'title')
    if (has(flags, 'url')) bookmark.url = required(flags, 'url')
    if (has(flags, 'description')) bookmark.description = required(flags, 'description')
    if (has(flags, 'tag')) bookmark.tags = parseTags(flags)
    if (has(flags, 'category')) bookmark.categories = parseMemberships(flags)!
    if (has(flags, 'daily-position')) bookmark.dailyPosition = optionalNumber(flags, 'daily-position')
    if (has(flags, 'clear-daily')) delete bookmark.dailyPosition
    applySubscription(bookmark, flags)
  } else if (command === 'promote-bookmark') {
    const id = required(flags, 'id')
    const bookmark = data.bookmarks.find((item) => item.id === id)
    if (!bookmark) throw new Error(`Bookmark "${id}" does not exist`)
    const collection = required(flags, 'collection')
    if (collection !== 'web' && collection !== 'youtube') throw new Error('--collection must be web or youtube')
    placeBookmark(data, bookmark, collection, placementPosition(flags))
  } else if (command === 'demote-bookmark') {
    const id = required(flags, 'id')
    const bookmark = data.bookmarks.find((item) => item.id === id)
    if (!bookmark) throw new Error(`Bookmark "${id}" does not exist`)
    removePlacement(data, bookmark)
  } else if (command === 'remove-bookmark') {
    const id = required(flags, 'id')
    const bookmark = data.bookmarks.find((item) => item.id === id)
    if (!bookmark) throw new Error(`Bookmark "${id}" does not exist`)
    removePlacement(data, bookmark)
    data.bookmarks = data.bookmarks.filter((item) => item.id !== id)
  } else {
    throw new Error(`Unknown command "${command}". Run with help to see available commands.`)
  }

  await writeManagedData(data)
}

run().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
