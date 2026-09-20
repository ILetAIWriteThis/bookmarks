# Bookmarks

A responsive, installable bookmark PWA built with React, TypeScript, and Vite. It is designed for the `/bookmarks/` GitHub Pages path and uses hash routes, so category links survive direct navigation on static hosting.

## Run it locally

```bash
npm install
npm run dev
```

Run all non-browser checks with `npm run check`. Run `npm run test:e2e` after a production build (and after installing Chromium once with `npx playwright install chromium`). `npm run build` uses `/bookmarks/` as its production base; set `VITE_BASE_PATH` to override it.

## V2 experiment

Choose **Try Bookmarks V2** on the homepage, or open `/bookmarks/#/v2`. Web (`#/v2/web`) shows Daily bookmarks; YouTube (`#/v2/youtube`) shows bookmarks assigned directly to `youtube-top`. Both use a single-column list sorted by the saved position, with titles breaking ties. Filtering preserves those positions, including gaps.

Tags combine existing bookmark tags with category and ancestor names; Web also adds `#daily`. Select multiple tags to match all of them, or select **All** to clear the filter. Each space remembers its selections while switching between Web and YouTube; reloading resets them. V2 reads the existing data without modifying it, and **Original home** returns to the original view.

## Manage bookmark data

Do not edit `public/data/bookmarks.json` directly. All changes go through the validated manager:

```bash
npm run bookmarks -- help
npm run bookmarks -- list
npm run bookmarks -- add-bookmark --id example --title "Example" --url https://example.com --category news:3 --category tech-ai:1 --daily-position 1
npm run bookmarks -- update-bookmark --id example --tag morning --tag analysis --clear-daily
npm run bookmarks -- remove-bookmark --id example
```

The CLI updates an integrity checksum atomically and CI rejects direct JSON edits. IDs must be unique, URLs must use HTTPS, and memberships must point to existing categories. Repeat `--category ID:POSITION` to assign a bookmark to multiple categories; on update, the supplied category flags replace its complete membership list.

Daily is independent of category membership. A bookmark can have `--daily-position 1` while also belonging to one or more categories. Numeric positions sort ascending within their own section; titles break ties alphabetically.

## Category hierarchy

Categories can be nested to arbitrary depth. Create a child with `--parent`:

```bash
npm run bookmarks -- add-category --id youtube-podcasts --name "Podcasts" --position 1 --parent youtube --icon play
npm run bookmarks -- update-category --id youtube-podcasts --parent media
npm run bookmarks -- update-category --id youtube-podcasts --clear-parent
```

Only categories without a parent appear on Home. Parent pages show their immediate children, counts include all descendants, and search matches ancestor category names. A bookmark can belong to multiple children—even children of the same parent:

```bash
npm run bookmarks -- add-bookmark --id science-show --title "Science Show" --url https://example.com --category youtube-podcasts:2 --category youtube-science:1
```

The validator rejects missing parents, self-parenting, and cycles. A category cannot be removed while it still has children or bookmarks. Theme and icon are optional; omitted values receive deterministic fallbacks.

## PWA and deployment

The service worker caches the application shell, bookmark data, and same-origin assets. After the first successful load, the app can reopen offline; external bookmark destinations still need a network connection. The app displays offline status and prompts when an update is waiting.

The GitHub Actions workflow validates managed data, type-checks, runs unit/component and desktop/mobile browser tests, builds the production site, and deploys `dist`. In repository settings, choose **GitHub Actions** as the Pages source.
