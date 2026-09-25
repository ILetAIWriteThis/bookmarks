# Bookmarks

A responsive, installable bookmark PWA built with React, TypeScript, and Vite. It is designed for the `/bookmarks/` GitHub Pages path and uses hash routes, so category links survive direct navigation on static hosting.

## Run it locally

```bash
npm install
npm run dev
```

Run all non-browser checks with `npm run check`. Run `npm run test:e2e` after a production build (and after installing Chromium once with `npx playwright install chromium`). `npm run build` uses `/bookmarks/` as its production base; set `VITE_BASE_PATH` to override it.

## Bookmark views

The default `/bookmarks/` page shows reviewed Web bookmarks. `#/youtube`, `#/media`, and `#/travel` open the other reviewed collections. Each uses a single-column list sorted by saved position, with search and multi-select tag filters. The old collection is at `#/old`, with categories at `#/old/category/ID`. Existing `#/category/ID` links still open the corresponding old category, and `#/v2` links still open the reviewed view.

Only bookmarks with an explicit collection placement appear in the reviewed view. Bookmarks without a placement appear in the old view, including its search, categories, and random picker. Tags use the bookmark's saved tags; select multiple tags to match all of them, or select **All** to clear the filter. Each collection remembers its selections while switching; reloading resets them. Collection totals are not shown.

Media entries now live in the bookmark store. Books link to Goodreads and films and shows link to IMDb. Their tags distinguish `book`, `movie`, and `tv-series`; existing genres use `genre:...`, franchises use `franchise:...`, and explicit numbered book series use `series:...`. Reading, watching, release, and added dates were discarded during migration. The duplicate Brigade/Law of the Lawless TV listing was merged into one bookmark.

The Travel collection is for places visited and saved from Maps. It currently contains Pūčkorių piliakalnis under the existing Visited Places category, tagged `europe`, `lithuania`, `nature`, and `hiking`. The 19 existing travel websites and older bookmarks remain in the old collection. Travel uses the same search and tag filters as the other reviewed collections.

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
npm run bookmarks -- list --collection media
npm run bookmarks -- add-bookmark --id example-film --title "Example Film" --url https://www.imdb.com/title/tt1234567/ --tag movie --tag genre:action --category media:1 --collection media --position 1
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
