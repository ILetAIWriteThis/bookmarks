# Repository instructions

- Never edit `public/data/bookmarks.json` or `public/data/bookmarks.sha256` directly.
- Manage bookmark data only through `npm run bookmarks -- <command>`. The CLI validates the complete data set and updates its integrity checksum atomically.
- Create category hierarchy through the CLI flags --parent and --clear-parent; hierarchy must remain generic and must not be hard-coded for one root category.
- Run `npm run bookmarks -- help` for supported commands and examples.
- If a task needs a data operation the CLI does not support, extend `scripts/manage-bookmarks.ts` first, then use the new command.
- Run `npm run check` after application or data changes.
