# Synthesize Everything

Personal Obsidian plugin that tracks which notes you have **synthesized** (manually marked after absorbing them).

- Every markdown note starts **not synthesized**
- Status bar shows the current note’s state and, if synthesized, the date
- Click the status bar (or use a command) to mark / unmark
- Unsynthesized notes show a yellow title in the file explorer

## Develop

```bash
npm install
npm test
npm run build
obs-deploy          # build + copy into configured vaults
```

Requires global `obs-deploy` and `~/.config/obsidian/deploy.json` pointing at your vault(s).

## Enable in Obsidian

After deploy: **Settings → Community plugins → Synthesize Everything → enable**. Reload Obsidian if it was already open.
