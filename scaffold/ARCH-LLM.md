# Architecture (agent reference)

Personal Obsidian plugin: **Synthesize Everything**. Tracks which vault notes the user has "synthesized" (manually marked after absorbing the content). Default: every note is unsynthesized.

## Product rules
- Scope: personal use only; one human operator.
- Unit of tracking: markdown notes only (paths ending in `.md`). Folders and non-md files are ignored.
- Default state: not synthesized. No auto-detection of content quality.
- User marks synthesized (and can unmark) via status bar click or command.
- When marked, store an ISO-8601 timestamp of that moment; display a short local date on the status bar.
- Status lives on the **status bar** (bottom of Obsidian). No ribbon icon.
- Unsynthesized markdown files in the **file explorer** get a yellow title color (CSS class). Synthesized files use default coloring.
- Persistence: plugin `data.json` via Obsidian `loadData`/`saveData`. Does **not** write frontmatter into notes.
- Data shape: `{ "entries": { "<vault-relative-path>": { "synthesizedAt": "<ISO>" } } }`. Path absent ⇒ not synthesized.
- Rename: move entry key with the file. Delete: drop entry.

## Deploy
- Tool: global `obs-deploy` (`~/.local/bin/obs-deploy`).
- Requires root `manifest.json`, `npm run build` → `dist/main.js`, optional root `styles.css`.
- Copies into each vault in `~/.config/obsidian/deploy.json` under `.obsidian/plugins/<manifest.id>/`.
- Plugin id: `synthesize-everything`.

## Code layout
- `src/store.ts` — pure data helpers (mark/unmark/toggle/rename/delete, labels). Unit-tested.
- `src/main.ts` — Obsidian `Plugin`: status bar, commands, vault events, file-explorer decoration.
- `styles.css` — status bar + file explorer yellow tint.
- `esbuild.config.mjs` — bundles `src/main.ts` → `dist/main.js` (external: `obsidian`).
- Tests: Vitest, `src/**/*.test.ts`. `npm test` / `npm run build`.

## UI
- Status bar for active markdown file:
  - not synthesized: `○ Not synthesized` (click → mark now)
  - synthesized: `✓ Synthesized · <short date>` (click → unmark)
- Commands (Command Palette):
  - `Toggle synthesized for current note`
  - `Mark current note as synthesized`
  - `Mark current note as not synthesized`
