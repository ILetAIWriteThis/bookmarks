import type { Bookmark } from '../types'
import { Icon } from '../icons'

interface BookmarkCardProps {
  bookmark: Bookmark
}

export function BookmarkCard({ bookmark }: BookmarkCardProps) {
  const hostname = new URL(bookmark.url).hostname.replace(/^www\./, '')

  return (
    <a
      className="bookmark-card"
      href={bookmark.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${bookmark.title} — opens ${hostname} in a new tab`}
    >
      <span className="bookmark-card__favicon" aria-hidden="true">
        {bookmark.title.charAt(0).toLocaleUpperCase()}
      </span>
      <span className="bookmark-card__body">
        <span className="bookmark-card__title-row">
          <strong>{bookmark.title}</strong>
          <Icon name="external" size={16} />
        </span>
        {bookmark.description && <span className="bookmark-card__description">{bookmark.description}</span>}
        <span className="bookmark-card__meta">
          <span>{hostname}</span>
          {bookmark.tags?.slice(0, 3).map((tag) => <span className="tag" key={tag}>{tag}</span>)}
        </span>
      </span>
    </a>
  )
}
