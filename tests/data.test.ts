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

  it('places unsubscribed channels after subscribed ones regardless of position', () => {
    const channels = validateBookmarkData({
      categories: [{ id: "youtube", name: "YouTube", position: 1 }],
      bookmarks: [
        { id: "later", title: "Later", url: "https://www.youtube.com/@later/videos", subscribed: false, categories: [{ categoryId: "youtube", position: 1 }] },
        { id: "first", title: "First", url: "https://www.youtube.com/@first/videos", categories: [{ categoryId: "youtube", position: 2 }] },
      ],
    }).bookmarks
    expect(bookmarksForCategory(channels, "youtube").map(({ id }) => id)).toEqual(["first", "later"])
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

  it('defaults YouTube channels to subscribed and limits the field to channels', () => {
    const youtubeChannel = validateBookmarkData({
      categories: [],
      bookmarks: [{ id: "channel", title: "Channel", url: "https://www.youtube.com/@channel/videos", categories: [] }],
    }).bookmarks[0]
    expect(youtubeChannel.subscribed).toBeUndefined()
    expect(() => validateBookmarkData({
      categories: [],
      bookmarks: [{ id: "site", title: "Site", url: "https://example.com", subscribed: false, categories: [] }],
    })).toThrow(/subscribed only applies to YouTube channel URLs/)
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
