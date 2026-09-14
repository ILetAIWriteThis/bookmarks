import type { Bookmark } from '../types'
import { Icon } from '../icons'

interface BookmarkCardProps {
  bookmark: Bookmark
}

const isYouTubeChannel = (url: string) => {
  const { hostname, pathname } = new URL(url)
  const normalizedHostname = hostname.replace(/^www\./, "")
  return (normalizedHostname === "youtube.com" || normalizedHostname === "m.youtube.com")
    && (/^\/@[^/]+/.test(pathname) || /^\/channel\/[^/]+/.test(pathname))
}

export function BookmarkCard({ bookmark }: BookmarkCardProps) {
  const hostname = new URL(bookmark.url).hostname.replace(/^www\./, "")
  const isYouTube = isYouTubeChannel(bookmark.url)

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
          {isYouTube && <span className={bookmark.subscribed === false ? "tag tag--subscription tag--not-subscribed" : "tag tag--subscription"}>{bookmark.subscribed === false ? "Not subscribed" : "Subscribed"}</span>}
          {bookmark.tags?.slice(0, 3).map((tag) => <span className="tag" key={tag}>{tag}</span>)}
        </span>
      </span>
    </a>
  )
}
