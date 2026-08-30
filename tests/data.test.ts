import {
  bookmarksForCategory,
  bookmarksForCategoryTree,
  childCategories,
  dailyBookmarks,
  rootCategories,
  searchBookmarks,
  validateBookmarkData,
} from '../src/data'
import { fallbackTheme } from '../src/theme'
import { testData } from './fixtures'

describe('bookmark data', () => {
  it('accepts multi-category memberships and sorts each category independently', () => {
    const data = validateBookmarkData(testData)
    expect(bookmarksForCategory(data.bookmarks, 'news').map(({ id }) => id)).toEqual(['alpha', 'example'])
    expect(bookmarksForCategory(data.bookmarks, 'tech').map(({ id }) => id)).toEqual(['example'])
    expect(dailyBookmarks(data.bookmarks).map(({ id }) => id)).toEqual(['alpha', 'example'])
  })

  it('supports arbitrary category hierarchy and ancestor-aware search', () => {
    const hierarchical = validateBookmarkData({
      categories: [
        ...testData.categories,
        { id: 'podcasts', name: 'Podcasts', position: 1, parentId: 'tech' },
        { id: 'science', name: 'Science', position: 2, parentId: 'tech' },
      ],
      bookmarks: [{
        ...testData.bookmarks[0],
        categories: [
          { categoryId: 'podcasts', position: 2 },
          { categoryId: 'science', position: 1 },
        ],
      }],
    })
    expect(rootCategories(hierarchical.categories).map(({ id }) => id)).toEqual(['news', 'tech', 'empty'])
    expect(childCategories(hierarchical.categories, 'tech').map(({ id }) => id)).toEqual(['podcasts', 'science'])
    expect(bookmarksForCategoryTree(hierarchical, 'tech').map(({ id }) => id)).toEqual(['example'])
    expect(searchBookmarks(hierarchical, 'tech').map(({ id }) => id)).toEqual(['example'])
  })

  it('rejects missing parents and hierarchy cycles', () => {
    expect(() => validateBookmarkData({
      categories: [{ id: 'child', name: 'Child', position: 1, parentId: 'missing' }], bookmarks: [],
    })).toThrow(/parentId references unknown category/)
    expect(() => validateBookmarkData({
      categories: [
        { id: 'one', name: 'One', position: 1, parentId: 'two' },
        { id: 'two', name: 'Two', position: 1, parentId: 'one' },
      ],
      bookmarks: [],
    })).toThrow(/hierarchy contains a cycle/)
  })

  it('sorts tied positions alphabetically', () => {
    const tied = testData.bookmarks.map((bookmark) => ({ ...bookmark, dailyPosition: 1 }))
    expect(dailyBookmarks(tied).map(({ title }) => title)).toEqual(['Alpha News', 'Example Journal'])
  })

  it('rejects duplicate Daily positions', () => {
    const duplicateDailyPosition = {
      ...testData,
      bookmarks: testData.bookmarks.map((bookmark) => ({ ...bookmark, dailyPosition: 1 })),
    }
    expect(() => validateBookmarkData(duplicateDailyPosition)).toThrow(/dailyPosition duplicates position 1/)
  })

  it('rejects duplicate bookmark URLs', () => {
    const duplicateUrl = {
      ...testData,
      bookmarks: [
        ...testData.bookmarks,
        { ...testData.bookmarks[0], id: 'duplicate', url: 'https://EXAMPLE.com/journal' },
      ],
    }
    expect(() => validateBookmarkData(duplicateUrl)).toThrow(/url duplicates URL/)
  })

  it('searches normalized text, hostnames, tags, and category names', () => {
    expect(searchBookmarks(testData, 'tech').map(({ id }) => id)).toEqual(['example'])
    expect(searchBookmarks(testData, 'TECH').map(({ id }) => id)).toEqual(['example'])
    expect(searchBookmarks(testData, 'alpha.example').map(({ id }) => id)).toEqual(['alpha'])
    expect(searchBookmarks(testData, 'morning').map(({ id }) => id)).toEqual(['example'])
  })

  it('reports duplicate ids, invalid URLs, and unknown category references together', () => {
    const invalid = {
      categories: [{ id: 'one', name: 'One', position: 1 }, { id: 'one', name: 'Again', position: 2 }],
      bookmarks: [
        { id: 'same', title: 'HTTP', url: 'http://example.com', categories: [{ categoryId: 'missing', position: 1 }] },
        { id: 'same', title: 'Bad', url: 'not a url', categories: [] },
      ],
    }
    expect(() => validateBookmarkData(invalid)).toThrow(/duplicate category id/)
    expect(() => validateBookmarkData(invalid)).toThrow(/duplicate bookmark id/)
    expect(() => validateBookmarkData(invalid)).toThrow(/must use HTTPS/)
    expect(() => validateBookmarkData(invalid)).toThrow(/unknown category/)
  })

  it('creates a stable fallback theme for future categories', () => {
    expect(fallbackTheme('future')).toEqual(fallbackTheme('future'))
    expect(fallbackTheme('future')).not.toEqual(fallbackTheme('another'))
    expect(fallbackTheme('future').accent).toMatch(/^hsl\(/)
  })
})
