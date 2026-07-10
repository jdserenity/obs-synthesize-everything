# Architecture (human-readable)

## What this is
**Synthesize Everything** is a small Obsidian plugin for personal use. It answers: “Have I actually synthesized this note yet?”

Every markdown note starts as **not synthesized**. You mark it yourself when you have. The plugin remembers the date you marked it.

## What you see
```
┌─ File explorer ─────────────────────────┐
│  AI Future                              │
│    AI 2027 Notes          ← yellow title│  (not synthesized yet)
│    Modelling The Future   ← normal      │  (already synthesized)
└─────────────────────────────────────────┘

Status bar (bottom):  ○ Not synthesized
                      or  ✓ Synthesized · 10 Jul 2026
Click the status bar text to toggle.
```

## How data is stored
Nothing is written into your notes. State lives in the plugin’s own `data.json` inside Obsidian’s plugin folder:

```text
.obsidian/plugins/synthesize-everything/data.json
```

Shape:

```json
{
  "entries": {
    "Economics/Bonds.md": { "synthesizedAt": "2026-07-10T15:30:00.000Z" }
  }
}
```

If a path is missing from `entries`, it is not synthesized.

## Deploy
From this repo:

```bash
obs-deploy
```

That runs `npm run build`, then copies `dist/main.js` → `main.js`, plus `manifest.json` and `styles.css`, into every vault listed in `~/.config/obsidian/deploy.json`.

Then enable the plugin in Obsidian: **Settings → Community plugins → Synthesize Everything**.

## Source map
| Path | Role |
|------|------|
| `src/store.ts` | Pure logic: mark / unmark / labels |
| `src/main.ts` | Hooks into Obsidian UI and vault events |
| `styles.css` | Yellow file names + status bar look |
| `manifest.json` | Plugin id/name for Obsidian + deploy |
