# Pokemon Binder

A Windows desktop app for tracking and valuing your Pokemon card collection. Organize cards into binders and pages, browse the full TCG card catalog, and get live market prices — all stored locally on your computer.

No account, no API key, no web server needed.

---

## Download & Install

1. Go to the [Releases](https://github.com/indal0x0/pokemon-binder/releases) page
2. Download the latest `Pokemon-Binder-Setup-x.x.x.exe`
3. Run the installer — it creates a Desktop shortcut and Start Menu entry
4. Launch **Pokemon Binder** and start adding cards

> Your collection data is saved to `%AppData%\Pokemon Binder` and stays on your computer.

---

## Features

- **Binders** — Create multiple binders, each with a custom cover (color, pattern, or your own image)
- **Pages** — Organize cards into pages with configurable grid layouts
- **Card browser** — Search the full Pokemon TCG catalog (powered by TCGDex)
- **Live prices** — Fetch current market prices on demand from pokemontcg.io (requires internet)
- **Card detail** — View all price variants (holofoil, normal, reverse holo, etc.) and Cardmarket data
- **Themes** — 20+ color themes including animated backgrounds
- **Fully offline** — The app runs entirely on your machine; only price fetching needs internet

---

## Build from Source

**Prerequisites:** [Node.js 20+](https://nodejs.org) and [Git](https://git-scm.com)

```bash
# 1. Clone the repo
git clone https://github.com/indal0x0/pokemon-binder.git
cd pokemon-binder

# 2. Install dependencies
npm install

# 3. Rebuild native modules for Electron
npm run electron:rebuild

# 4. Build the Windows installer
npm run electron:build
```

The installer will be output to `dist/Pokemon Binder Setup x.x.x.exe`.

**Dev mode** (hot-reload UI + live Electron window):

```bash
npm run electron:dev
```

---

## Data & Privacy

- All data is stored locally in `%AppData%\Pokemon Binder`
- No data is sent to any server (except outbound price requests to pokemontcg.io and TCGDex)
- Uninstalling via the Control Panel does **not** delete your collection data — remove the folder manually if desired

---

## Tech Stack

- [Electron](https://electronjs.org) — desktop shell
- [Next.js](https://nextjs.org) 16 + React 19 — UI (compiled to static export)
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) — local database
- [TCGDex API](https://tcgdex.dev) — card search
- [pokemontcg.io](https://pokemontcg.io) — card pricing
- [Tailwind CSS](https://tailwindcss.com) v4 + [shadcn/ui](https://ui.shadcn.com)
