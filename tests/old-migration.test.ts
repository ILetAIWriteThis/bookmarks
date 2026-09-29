import { migrateOldBookmarks } from '../src/migration'
import type { BookmarkData } from '../src/types'

it('keeps existing tags, follows category ancestors, and appends to reviewed positions', () => {
  const data: BookmarkData = {
    categories: [
      { id: 'youtube', name: 'YouTube', position: 1 },
      { id: 'security', name: 'Security', position: 2, parentId: 'youtube' },
      { id: 'talks', name: 'Conferences', position: 3, parentId: 'security' },
      { id: 'learning', name: 'Learning', position: 4 },
    ],
    bookmarks: [
      { id: 'existing', title: 'Existing', url: 'https://example.com/1', tags: ['saved'], categories: [], placement: { collection: 'youtube', position: 7 } },
      { id: 'channel', title: 'Channel', url: 'https://example.com/2', tags: ['saved'], categories: [{ categoryId: 'talks', position: 1 }] },
      { id: 'course', title: 'Course', url: 'https://example.com/3', tags: ['saved'], categories: [{ categoryId: 'learning', position: 1 }] },
    ],
  }
  expect(migrateOldBookmarks(data)).toEqual({ web: 1, youtube: 1 })
  expect(data.bookmarks[0].tags).toEqual(['saved'])
  expect(data.bookmarks[0].placement).toEqual({ collection: 'youtube', position: 7 })
  expect(data.bookmarks[1].tags).toEqual(['saved', 'youtube', 'security', 'conferences'])
  expect(data.bookmarks[1].placement).toEqual({ collection: 'youtube', position: 8 })
  expect(data.bookmarks[2].tags).toEqual(['saved', 'learning'])
  expect(data.bookmarks[2].placement).toEqual({ collection: 'web', position: 0 })
})
