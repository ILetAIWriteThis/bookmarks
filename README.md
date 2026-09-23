# Bookmarks

A responsive, installable bookmark PWA built with React, TypeScript, and Vite. It is designed for the `/bookmarks/` GitHub Pages path and uses hash routes, so category links survive direct navigation on static hosting.

## Run it locally

```bash
npm install
npm run dev
```

Run all non-browser checks with `npm run check`. Run `npm run test:e2e` after a production build (and after installing Chromium once with `npx playwright install chromium`). `npm run build` uses `/bookmarks/` as its production base; set `VITE_BASE_PATH` to override it.

## Bookmark views

The default `/bookmarks/` page shows reviewed Web bookmarks. `#/youtube` shows reviewed YouTube bookmarks. Both use a single-column list sorted by their saved collection position. The old collection is at `#/old`, with categories at `#/old/category/ID`. Existing `#/category/ID` links still open the corresponding old category, and `#/v2` links still open the reviewed view.

Only bookmarks with an explicit collection placement appear in the reviewed view. Bookmarks without a placement appear in the old view, including its search, categories, counts, and random picker. The original 11 Web bookmarks have been promoted; the other bookmarks remain in the old view until reviewed. Tags combine existing bookmark tags with category and ancestor names; bookmarks with a Daily position also have `#daily`. Select multiple tags to match all of them, or select **All** to clear the filter. Each space remembers its selections while switching between Web and YouTube; reloading resets them.

## Personal library

Open `#/library` for books and `#/library/screen` for films and TV shows together. The older `#/library/movies` and `#/library/tv` links still open Screen with the matching type selected. The library has its own storage in `public/data/media.json`; it does not use or change bookmark data. Books open first. Screen has a Movie/TV filter and a universe filter, so a film and show can share a world such as the Marvel Cinematic Universe. Series stays separate for ordered works such as Avengers films or Harry Potter books. Search, genre, series, and universe filters are visible immediately; creator, year, and language (when relevant) are under **More filters**. Filter options with more matching entries appear first; ties use alphabetical order. Counts are used for this ordering but are not shown. Sorting includes recent activity, title, publication or release date, creator, and series order. The adjacent order button reverses any sort, such as newest/oldest publication or A–Z/Z–A title order.

Each library entry has a stable ID, kind (`book`, `movie`, or `tv`), title, creator names, publication or release year/date, date added, and genres. An optional `url` may point to Goodreads, IMDb, a technical PDF, or another HTTPS source; entries without a URL have no open button. Other optional fields are `completedDates` (all read or watched dates), `series` (`name` and optional one-based `position`), and `universe`. Books may have `language` when useful for distinguishing editions; no language badge is shown on cards. TV shows may have `seasons`, each with a `number` and optional `completedDates`. Dates use `YYYY-MM-DD`; publication or release may also be a four-digit year. Recent activity uses the latest date among date added and all completion dates, including season dates. The interface shows dates but no reading or watching totals. The shipped library starts empty.

Add another date to `completedDates` when rereading the same book edition or rewatching the same film. For a book in another language, create a separate entry with its own ID and translated title; add `language` only if it helps distinguish the entries. You can add dates to an individual TV season when rewatching it.

For example, a new book entry in `public/data/media.json` can use:

```json
{ "id": "example-book", "kind": "book", "title": "Example Book", "creators": ["Author Name"], "published": "2024", "addedOn": "2026-09-23", "completedDates": ["2026-09-23"], "genres": ["Fantasy"], "series": { "name": "Example Series", "position": 1 } }
```

## Manage bookmark data

Do not edit `public/data/bookmarks.json` directly. All changes go through the validated manager:

```bash
npm run bookmarks -- help
npm run bookmarks -- list
npm run bookmarks -- add-bookmark --id example --title "Example" --url https://example.com --category news:3 --category tech-ai:1
npm run bookmarks -- update-bookmark --id example --tag morning --tag analysis --clear-daily
npm run bookmarks -- promote-bookmark --id example --collection web --position 11
npm run bookmarks -- add-bookmark --id new-site --title "New Site" --url https://example.org --collection web --position 11
npm run bookmarks -- demote-bookmark --id example
npm run bookmarks -- list --collection old
npm run bookmarks -- remove-bookmark --id example
```

The CLI updates an integrity checksum atomically and CI rejects direct JSON edits. IDs must be unique, URLs must use HTTPS, and memberships must point to existing categories. Repeat `--category ID:POSITION` to assign a bookmark to multiple categories; on update, the supplied category flags replace its complete membership list. New bookmarks go to the old view unless you provide `--collection` and `--position`. Promoting or adding a bookmark at an occupied position shifts that bookmark and all later positions forward by one. Moving an already promoted bookmark closes its old slot; demoting it returns it to the old view.

Daily is legacy metadata independent of category membership and reviewed placement. A bookmark can have `--daily-position 1` while also belonging to one or more categories. Numeric positions sort ascending within their own section; titles break ties alphabetically.

## Category hierarchy

Categories can be nested to arbitrary depth. Create a child with `--parent`:

```bash
npm run bookmarks -- add-category --id youtube-podcasts --name "Podcasts" --position 1 --parent youtube --icon play
npm run bookmarks -- update-category --id youtube-podcasts --parent media
npm run bookmarks -- update-category --id youtube-podcasts --clear-parent
```

Only categories without a parent appear on the old homepage. Parent pages show their immediate children, counts include all unreviewed descendants, and old-view search matches ancestor category names. A bookmark can belong to multiple children—even children of the same parent:

```bash
npm run bookmarks -- add-bookmark --id science-show --title "Science Show" --url https://example.com --category youtube-podcasts:2 --category youtube-science:1
```

The validator rejects missing parents, self-parenting, and cycles. A category cannot be removed while it still has children or bookmarks. Theme and icon are optional; omitted values receive deterministic fallbacks.

## PWA and deployment

The service worker caches the application shell, bookmark data, and same-origin assets. After the first successful load, the app can reopen offline; external bookmark destinations still need a network connection. The app displays offline status and prompts when an update is waiting.

The GitHub Actions workflow validates managed data, type-checks, runs unit/component and desktop/mobile browser tests, builds the production site, and deploys `dist`. In repository settings, choose **GitHub Actions** as the Pages source.
