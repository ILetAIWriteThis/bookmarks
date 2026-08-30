import type { BookmarkData } from '../src/types'

export const testData: BookmarkData = {
  categories: [
    { id: 'news', name: 'News', position: 1, icon: 'newspaper' },
    { id: 'tech', name: 'Téch/AI', position: 2, icon: 'spark' },
    { id: 'empty', name: 'Empty shelf', position: 3 },
  ],
  bookmarks: [
    {
      id: 'example', title: 'Example Journal', url: 'https://example.com/journal',
      description: 'Thoughtful world reporting', tags: ['morning', 'analysis'], dailyPosition: 2,
      categories: [{ categoryId: 'news', position: 2 }, { categoryId: 'tech', position: 1 }],
    },
    {
      id: 'alpha', title: 'Alpha News', url: 'https://alpha.example/news', dailyPosition: 1,
      categories: [{ categoryId: 'news', position: 1 }],
    },
  ],
}
