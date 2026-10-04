# Bookmarks

A responsive, installable bookmark PWA built with React, TypeScript, and Vite. It is designed for the `/bookmarks/` GitHub Pages path and uses hash routes for collections.

## Run it locally

```bash
npm install
npm run dev
```

Run all non-browser checks with `npm run check`. Run `npm run test:e2e` after a production build (and after installing Chromium once with `npx playwright install chromium`). `npm run build` uses `/bookmarks/` as its production base; set `VITE_BASE_PATH` to override it.

## Bookmark views

The default `/bookmarks/` page shows Web bookmarks. `#/youtube` opens the YouTube collection. Each uses a single-column list sorted by saved position, with search and multi-select tag filters. Retired old bookmark, Media, and Travel routes fall back to Web.

All bookmarks have a collection placement. Tags use the bookmark's saved tags; select multiple tags to match all of them, or select **All** to clear the filter. Each collection remembers its selections while switching; reloading resets them. Collection totals are not shown.

Media and Travel categories and their bookmarks have been removed. All remaining bookmarks are tagged `not-reviewed`, alongside their existing tags. The YouTube Travel topic remains.

## Manage bookmark data

Do not edit `public/data/bookmarks.json` directly. All changes go through the validated manager:

```bash
npm run bookmarks -- help
npm run bookmarks -- migrate-old
npm run bookmarks -- list
npm run bookmarks -- add-bookmark --id example --title "Example" --url https://example.com --category news:3 --category tech-ai:1
npm run bookmarks -- update-bookmark --id example --tag morning --tag analysis --clear-daily
npm run bookmarks -- promote-bookmark --id example --collection web --position 11
npm run bookmarks -- add-bookmark --id new-site --title "New Site" --url https://example.org --collection web --position 11
npm run bookmarks -- remove-bookmark --id example
npm run bookmarks -- remove-bookmarks --id example --id another-example
```

The CLI updates an integrity checksum atomically and CI rejects direct JSON edits. IDs must be unique, URLs must use HTTPS, and memberships must point to existing categories. Repeat `--category ID:POSITION` to assign a bookmark to multiple categories; on update, the supplied category flags replace its complete membership list. New bookmarks append to Web unless you provide `--collection` and `--position`. Promoting or adding a bookmark at an occupied position shifts that bookmark and all later positions forward by one. Moving an already promoted bookmark closes its old slot. `migrate-old` places unplaced bookmarks in YouTube when they belong to the YouTube category tree, and Web otherwise; it preserves existing tags and adds tags from category names, including ancestors.

Daily is legacy metadata independent of category membership and collection placement. A bookmark can have `--daily-position 1` while also belonging to one or more categories. Numeric positions sort ascending within their own section; titles break ties alphabetically.

## Category hierarchy

Categories can be nested to arbitrary depth. Create a child with `--parent`:

```bash
npm run bookmarks -- add-category --id youtube-podcasts --name "Podcasts" --position 1 --parent youtube --icon play
npm run bookmarks -- update-category --id youtube-podcasts --parent learning
npm run bookmarks -- update-category --id youtube-podcasts --clear-parent
```

Category hierarchy remains in the managed data and supplies migration tags from all ancestors. A bookmark can belong to multiple children—even children of the same parent:

```bash
npm run bookmarks -- add-bookmark --id science-show --title "Science Show" --url https://example.com --category youtube-podcasts:2 --category youtube-science:1
```

The validator rejects missing parents, self-parenting, and cycles. A category cannot be removed while it still has children or bookmarks. Theme and icon are optional; omitted values receive deterministic fallbacks.

## PWA and deployment

The service worker caches the application shell, bookmark data, and same-origin assets. After the first successful load, the app can reopen offline; external bookmark destinations still need a network connection. The app displays offline status and prompts when an update is waiting.

The GitHub Actions workflow validates managed data, type-checks, runs unit/component and desktop/mobile browser tests, builds the production site, and deploys `dist`. In repository settings, choose **GitHub Actions** as the Pages source.
