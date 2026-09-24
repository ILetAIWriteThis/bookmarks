---
name: manage-library-media
description: Add or update books, movies, or TV shows in this repository's personal library using the media CLI. Use for content in #/library or #/library/screen, not for Web or YouTube bookmarks.
---

# Manage library media

Use this workflow when adding a book, movie, or TV show to the personal library. Books appear at `#/library`; movies and TV shows appear at `#/library/screen`. The library data lives in `public/data/media.json`, separately from bookmark data.

1. Run `npm run bookmarks -- help` and inspect `public/data/media.json` for an existing entry with the same work or source URL. Choose a stable, unique ID. Do not add a duplicate to record another read or watch date.
2. Gather the title, creator names, publication or release year (`YYYY`) or date (`YYYY-MM-DD`), genres, and any user-provided read or watch dates (`YYYY-MM-DD`). Use `book`, `movie`, or `tv` for `--kind`. Use the current date for `--added-on`. If a source URL is supplied, use its HTTPS canonical URL and verify factual metadata against it where possible. Distinguish a user-estimated date from a known date in the final report.
3. Add the entry through the existing CLI. Repeat `--creator`, `--genre`, and `--completed-date` for multiple values. `--franchise` is optional for movies and TV shows; `--url` is optional for all kinds:

   ```bash
   npm run bookmarks -- add-media \
     --id "UNIQUE_ID" --kind book --title "TITLE" \
     --creator "CREATOR" --published "YYYY" --added-on "YYYY-MM-DD" \
     --genre "GENRE" --completed-date "YYYY-MM-DD" \
     --url "https://example.com/source"
   ```

   Replace the sample values and set `--kind` to `book`, `movie`, or `tv`. Omit optional flags when there is no value. `--creator` is the author for a book, director for a film, or creator for a show. Do not invent dates or source URLs; when the user explicitly asks for an estimated date, choose one and state the assumption.
4. For an existing entry, use `update-media --id ID` with `--franchise NAME`, `--clear-franchise`, `--completed-date DATE`, or `--set-completed-date DATE`. Do not create a duplicate to change its grouping or dates.
5. Run `npm run check`, then confirm the resulting entry in `public/data/media.json` and report its ID, route, and recorded dates.

The current CLI does not support changing book language, ordered series, or TV seasons. For those operations, follow `AGENTS.md` and extend the CLI before changing data; do not pass unsupported flags.
