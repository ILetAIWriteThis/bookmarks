import { BookmarkCard } from '../components/BookmarkCard'
import { CategoryCard } from '../components/CategoryCard'
import { EmptyState } from '../components/EmptyState'
import { bookmarksForCategory, bookmarksForCategoryTree, childCategories } from '../data'
import { Icon } from '../icons'
import { getCategoryTheme } from '../theme'
import type { BookmarkData } from '../types'

interface CategoryPageProps { data: BookmarkData; categoryId: string }

export function CategoryPage({ data, categoryId }: CategoryPageProps) {
  const category = data.categories.find((item) => item.id === categoryId)
  if (!category) {
    return (
      <main id="main-content" className="not-found">
        <p className="eyebrow">404 · unfiled</p>
        <h1>That category isn’t here.</h1>
        <p>It may have been renamed or removed from the bookmark data.</p>
        <a className="back-link" href="#/"><Icon name="back" size={18} /> Back home</a>
      </main>
    )
  }

  const parent = category.parentId ? data.categories.find((item) => item.id === category.parentId) : undefined
  const children = childCategories(data.categories, category.id)
  const bookmarks = bookmarksForCategory(data.bookmarks, category.id)
  const totalCount = bookmarksForCategoryTree(data, category.id).length
  const theme = getCategoryTheme(category)
  const backHref = parent ? `#/category/${encodeURIComponent(parent.id)}` : '#/'
  const backLabel = parent?.name ?? 'Home'

  return (
    <main
      id="main-content"
      className="category-page"
      style={{ '--theme-from': theme.from, '--theme-to': theme.to, '--theme-accent': theme.accent } as React.CSSProperties}
    >
      <div className="category-backdrop" aria-hidden="true"><span /><span /><span /></div>
      <div className="category-page__inner">
        <a className="back-link back-link--light" href={backHref}><Icon name="back" size={18} /> {backLabel}</a>
        <header className="category-hero">
          <span className="category-hero__icon"><Icon name={category.icon} size={38} /></span>
          <p className="eyebrow">{parent ? `${parent.name} · subcategory` : 'Category'} · {totalCount} bookmark{totalCount === 1 ? '' : 's'}</p>
          <h1>{category.name}</h1>
          <p>{children.length ? 'Choose a focused shelf, or open bookmarks filed directly here.' : 'A focused shelf for everything worth returning to.'}</p>
        </header>
        <section className="category-content" aria-label={`${category.name} contents`}>
          {children.length > 0 && (
            <div className="subcategory-block">
              <div className="nested-heading"><p className="section-kicker">Inside {category.name}</p><h2>Subcategories</h2></div>
              <div className="category-grid">
                {children.map((child) => <CategoryCard category={child} data={data} key={child.id} />)}
              </div>
            </div>
          )}
          {bookmarks.length > 0 && (
            <div className="direct-bookmarks">
              {children.length > 0 && <div className="nested-heading"><p className="section-kicker">Filed here</p><h2>{category.name} bookmarks</h2></div>}
              <div className="bookmark-grid" aria-label={`${category.name} bookmarks`}>
                {bookmarks.map((bookmark) => <BookmarkCard bookmark={bookmark} key={bookmark.id} />)}
              </div>
            </div>
          )}
          {children.length === 0 && bookmarks.length === 0 && (
            <EmptyState title="This shelf is ready" message={`Use the bookmark manager to assign something to “${category.name}”.`} />
          )}
        </section>
      </div>
    </main>
  )
}
