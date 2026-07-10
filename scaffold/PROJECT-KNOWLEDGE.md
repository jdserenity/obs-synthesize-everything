# Project knowledge

Hard-won lessons and context that should survive across agent sessions — setup traps, tooling quirks, things that would have been good to know going in.

Keep scaffold/ARCH-LLM.md for confirmed product and system facts only. One home per fact; don't duplicate architecture content here.

## File explorer coloring

Obsidian does not expose a public, stable API to style individual file-tree rows. Approach (same idea as community plugin `file-color`):

1. Prefer each `file-explorer` leaf’s internal `fileItems` map (`item.el` is the outer `.nav-file` row, not the title).
2. Also walk `.nav-file-title[data-path]` in the DOM (covers map shape drift and newly expanded folders).
3. CSS must target with high specificity under `.workspace-leaf-content[data-type="file-explorer"] .nav-files-container …` — weak selectors like bare `.nav-file-title.se-not-synthesized` get overridden by the theme and look like “color never applied.”
4. A `MutationObserver` (childList only) on `.nav-files-container` re-tints when folders expand.

If explorer tinting breaks after an Obsidian update, status bar + commands should still work.

## obs-deploy artifacts

`obs-deploy` expects `npm run build` to write `dist/main.js`, then copies it to `main.js` in each vault plugin folder. Optional `styles.css` and required `manifest.json` stay at the repo root (not under `dist/`).
