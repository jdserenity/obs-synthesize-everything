# Project knowledge

Hard-won lessons and context that should survive across agent sessions — setup traps, tooling quirks, things that would have been good to know going in.

Keep scaffold/ARCH-LLM.md for confirmed product and system facts only. One home per fact; don't duplicate architecture content here.

## File explorer coloring

Obsidian does not expose a public, stable API to style individual file-tree rows. This plugin walks each `file-explorer` leaf’s internal `fileItems` map and toggles a CSS class on the item element (`el` / `selfEl`). That map is unofficial; if a future Obsidian release changes the file explorer implementation, explorer tinting may break while status bar + commands still work.

## obs-deploy artifacts

`obs-deploy` expects `npm run build` to write `dist/main.js`, then copies it to `main.js` in each vault plugin folder. Optional `styles.css` and required `manifest.json` stay at the repo root (not under `dist/`).
