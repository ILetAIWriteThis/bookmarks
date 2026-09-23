export interface ThemeColors {
  from: string
  to: string
  accent: string
}

export interface Category {
  id: string
  name: string
  position: number
  parentId?: string
  icon?: string
  theme?: ThemeColors
}

export interface CategoryMembership {
  categoryId: string
  position: number
}

export interface BookmarkPlacement {
  collection: 'web' | 'youtube'
  position: number
}

export interface Bookmark {
  id: string
  title: string
  url: string
  description?: string
  tags?: string[]
  /** Applies to YouTube channel URLs; omitted channels are subscribed by default. */
  subscribed?: boolean
  dailyPosition?: number
  /** Only explicitly reviewed bookmarks appear in the main collections. */
  placement?: BookmarkPlacement
  categories: CategoryMembership[]
}

export interface BookmarkData {
  categories: Category[]
  bookmarks: Bookmark[]
}
