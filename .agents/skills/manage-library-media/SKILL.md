---
name: manage-library-media
description: Add books, movies, or TV shows to this repository's personal library using the existing media CLI. Use for content in #/library or #/library/screen, not for Web or YouTube bookmarks.
---

# Manage library media

Use this workflow when adding a book, movie, or TV show to the personal library. Books appear at `#/library`; movies and TV shows appear at `#/library/screen`. The library data lives in `public/data/media.json`, separately from bookmark data.

1. Run `npm run bookmarks -- help` and inspect `public/data/media.json` for an existing entry with the same work or source URL. Choose a stable, unique ID. Do not add a duplicate to record another read or watch date.
2. Gather the title, creator names, publication or release year (`YYYY`) or date (`YYYY-MM-DD`), genres, and any user-provided read or watch dates (`YYYY-MM-DD`). Use `book`, `movie`, or `tv` for `--kind`. Use the current date for `--added-on`. If a source URL is supplied, use its HTTPS canonical URL and verify factual metadata against it where possible. Distinguish a user-estimated date from a known date in the final report.
3. Add the entry through the existing CLI. Repeat `--creator`, `--genre`, and `--completed-date` for multiple values. `--universe` and `--url` are optional:

   ```bash
   npm run bookmarks -- add-media \
     --id "UNIQUE_ID" --kind book --title "TITLE" \
     --creator "CREATOR" --published "YYYY" --added-on "YYYY-MM-DD" \
     --genre "GENRE" --completed-date "YYYY-MM-DD" \
     --url "https://example.com/source"
   ```

   Replace the sample values and set `--kind` to `book`, `movie`, or `tv`. Omit optional flags when there is no value. `--creator` is the author for a book, director for a film, or creator for a show. Do not invent dates or source URLs; when the user explicitly asks for an estimated date, choose one and state the assumption.
4. Run `npm run check`, then confirm the resulting entry in `public/data/media.json` and report its ID, route, and recorded dates.

The current `add-media` command supports basic entries for all three kinds, repeated completion dates, genres, an optional universe, and an HTTPS URL. It does not accept book language, ordered series, TV seasons, or updates to existing entries. For a request that needs one of those operations, follow `AGENTS.md` and inspect the current CLI before changing data; do not pass unsupported flags or create a second entry for the same work.
