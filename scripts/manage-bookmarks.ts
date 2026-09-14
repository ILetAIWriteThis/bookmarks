import { createHash } from 'node:crypto'
import { readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { bookmarksForCategoryTree, childCategories, validateBookmarkData } from '../src/data'
import type { Bookmark, BookmarkData, Category, CategoryMembership } from '../src/types'

const dataPath = resolve(process.cwd(), 'public/data/bookmarks.json')
const checksumPath = resolve(process.cwd(), 'public/data/bookmarks.sha256')

type Flags = Map<string, string[]>

function usage() {
  console.log(`Bookmark data manager

Usage:
  npm run bookmarks -- list [--category ID]
  npm run bookmarks -- check
  npm run bookmarks -- upsert-bookmarks --file JSON_FILE
  npm run bookmarks -- add-category --id ID --name NAME --position N [--icon NAME] [--parent ID]
  npm run bookmarks -- update-category --id ID [--name NAME] [--position N] [--icon NAME] [--parent ID]
  npm run bookmarks -- remove-category --id ID
  npm run bookmarks -- add-bookmark --id ID --title TITLE --url HTTPS_URL [options]
  npm run bookmarks -- update-bookmark --id ID [options]
  npm run bookmarks -- remove-bookmark --id ID

Bookmark options:
  --description TEXT
  --tag TAG                 Repeat for multiple tags
  --category ID:POSITION    Repeat for multiple category assignments
  --daily-position N
  --clear-daily             update-bookmark only
  --subscribed              Mark a YouTube channel as subscribed
  --not-subscribed          Mark a YouTube channel as not subscribed
nCategory options:
  --parent ID               Nest below an existing category
  --clear-parent            Move an existing category to the root

Theme options (category commands; provide all three together):
  --from COLOR --to COLOR --accent COLOR

Examples:
  npm run bookmarks -- add-bookmark --id example --title "Example" --url https://example.com --category news:1 --category tech-ai:3 --daily-position 1
  npm run bookmarks -- update-bookmark --id example --tag reference --tag daily --clear-daily
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

async function run() {
  const [command = 'help', ...args] = process.argv.slice(2)
  if (command === 'help' || command === '--help' || command === '-h') return usage()
  const flags = parseFlags(args)
  const data = await readManagedData()

  if (command === 'check') {
    console.log(`Managed bookmark data is valid: ${data.categories.length} categories, ${data.bookmarks.length} bookmarks.`)
    return
  }
  if (command === 'list') {
    const categoryId = optional(flags, 'category')
    const bookmarks = categoryId ? bookmarksForCategoryTree(data, categoryId) : data.bookmarks
    console.log(`${data.categories.length} categories`)
    printCategoryTree(data.categories)
    console.log(`${bookmarks.length} bookmarks${categoryId ? ` in ${categoryId}` : ''}`)
    bookmarks.forEach((bookmark) => console.log(`  ${bookmark.id}\t${bookmark.title}\t${bookmark.url}`))
    return
  }

  if (command === 'upsert-bookmarks') {
    const importPath = resolve(process.cwd(), required(flags, 'file'))
    const importedValue = JSON.parse(await readFile(importPath, 'utf8')) as { bookmarks?: unknown }
    if (!Array.isArray(importedValue.bookmarks)) {
      throw new Error('Import file must contain a "bookmarks" array')
    }
    const imported = validateBookmarkData({ categories: data.categories, bookmarks: importedValue.bookmarks }).bookmarks
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
  } else if (command === 'remove-bookmark') {
    const id = required(flags, 'id')
    const before = data.bookmarks.length
    data.bookmarks = data.bookmarks.filter((bookmark) => bookmark.id !== id)
    if (data.bookmarks.length === before) throw new Error(`Bookmark "${id}" does not exist`)
  } else {
    throw new Error(`Unknown command "${command}". Run with help to see available commands.`)
  }

  await writeManagedData(data)
}

run().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
