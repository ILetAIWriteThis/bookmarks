import { bookmarksForCategoryTree } from '../data'
import { Icon } from '../icons'
import { getCategoryTheme } from '../theme'
import type { BookmarkData, Category } from '../types'

interface CategoryCardProps {
  category: Category
  data: BookmarkData
}

export function CategoryCard({ category, data }: CategoryCardProps) {
  const theme = getCategoryTheme(category)
  const count = bookmarksForCategoryTree(data, category.id).length
  const href = `#/old/category/${encodeURIComponent(category.id)}`

  return (
    <a
      className="category-card"
      href={href}
      style={{ '--theme-from': theme.from, '--theme-to': theme.to, '--theme-accent': theme.accent } as React.CSSProperties}
    >
      <span className="category-card__orb" aria-hidden="true" />
      <span className="category-card__icon"><Icon name={category.icon} size={28} /></span>
      <span className="category-card__copy">
        <strong>{category.name}</strong>
        <span>{count === 0 ? 'Ready for bookmarks' : `${count} bookmark${count === 1 ? '' : 's'}`}</span>
      </span>
      <Icon name="arrow" className="category-card__arrow" size={22} />
    </a>
  )
}
