# Architecture
_Last updated: 2026-04-03_

## Overview

OffDex is an Electron desktop application that wraps a Next.js 16 / React 19 frontend. The app lets users photograph physical Pokemon card binder pages, automatically identify the cards using Google Gemini AI, match them against the Pokemon TCG API for pricing data, and track their collection's total market value.

All data is stored locally in a SQLite database. There is no authentication and no remote server.

---

## Stack

| Layer | Technology |
|---|---|
| Desktop shell | Electron 41 |
| Frontend framework | Next.js 16 (App Router), React 19 |
| Styling | Tailwind CSS v4, shadcn/ui v4 |
| Database | SQLite via better-sqlite3 |
| ORM (web dev only) | Prisma 7 with `@prisma/adapter-better-sqlite3` |
| Card scanning AI | Google Gemini 1.5 Flash (`@google/generative-ai`) |
| Card pricing | Pokemon TCG API v2 (`api.pokemontcg.io`) |
| Settings persistence | electron-store |
| Notifications | sonner (toast) |

---

## Two Runtime Modes

The app runs in two distinct modes that share the same React/Next.js UI code:

### Development mode (`npm run electron:dev`)
- Next.js dev server runs on `localhost:3000`
- Electron loads `http://localhost:3000`
- Prisma client is available (used only during web-mode development/testing)
- Database and uploads live at `./dev.db` and `./public/uploads/`

### Production / Electron mode (`npm run electron:build`)
- Next.js is exported as a static site (`out/`)
- Electron registers a custom `app://` protocol to serve static files
- Database lives at `{userData}/pokemon-binder.db`
- Uploads and covers live at `{userData}/uploads/` and `{userData}/covers/`
- Prisma is NOT used — the Electron main process talks to SQLite directly via `electron/db.js`

---

## Process Architecture

```
┌─────────────────────────────────────────┐
│           Renderer Process              │
│  (Next.js React app — browser context)  │
│                                         │
│  window.electronAPI.*  ──────────────┐  │
└──────────────────────────────────────┼──┘
                                       │  contextBridge (preload.js)
┌──────────────────────────────────────┼──┐
│           Main Process               │  │
│  (electron/main.js — Node context)   │  │
│                                      ▼  │
│  ipcMain.handle(...)                    │
│   ├── electron/db.js    (SQLite CRUD)   │
│   ├── electron/scanner.js (Gemini AI)  │
│   └── electron/tcg.js  (TCG API)       │
└─────────────────────────────────────────┘
```

The renderer never accesses Node APIs directly. All privileged operations go through `window.electronAPI`, which is the contextBridge exposed by `electron/preload.js`. The preload translates each method into an `ipcRenderer.invoke()` call that the main process handles.

---

## IPC API Surface

The full `window.electronAPI` contract is typed in `src/types/electron.d.ts`. Categories:

- **Settings**: `getSettings`, `saveSettings`, `getUserDataPath`
- **Binders**: `listBinders`, `getBinder`, `createBinder`, `updateBinder`, `deleteBinder`, `uploadCover`
- **Pages**: `listPages`, `getPage`, `createPage`, `updatePage`, `deletePage`, `reorderPages`, `reorderPageCards`, `moveCardsToPage`
- **Cards**: `listCards`, `createCard`, `updateCard`, `deleteCard`, `refreshPrices`, `uploadCardImage`
- **Scanning**: `uploadImage`, `scanPage`
- **TCG search**: `searchTcg`, `getCardPrices`, `getCardPricesBatch`
- **Images**: `getImageUrl` (converts relative path to `app://` URL)

---

## Card Scanning Pipeline

When a user uploads a binder page photo and triggers a scan (`scanPage` IPC call):

1. **Image upload** — `upload:image` IPC handler saves the file to `{userData}/uploads/{binderId}/{filename}` and returns a relative path stored in the DB.

2. **AI identification** — `electron/scanner.js` `identifyCardsOnPage()` base64-encodes the image and calls the Gemini 1.5 Flash REST API with a structured JSON prompt. Returns an array of `IdentifiedCard` objects: `{ name, setName, collectorNumber, quantity, condition, notes }`.

3. **TCG matching** — `electron/tcg.js` `matchCard()` runs a 3-attempt cascade against `https://api.pokemontcg.io/v2/cards`:
   1. Name + collector number
   2. Name + set name
   3. Name only (picks highest market price)

4. **Price extraction** — `extractBestPrice()` selects the correct TCGPlayer price variant based on the `notes` field: 1st edition holofoil > holofoil > normal > reverse holofoil > any available.

5. **DB write** — A `binder_cards` row is created for each identified card. Unmatched cards get `tcgApiId = "unmatched-{uuid}"` and no pricing data. The page row is updated with `rawAiOutput` (raw Gemini JSON) for debugging and `status = "done"`.

---

## Data Model

Three tables, all managed by `electron/db.js` in production:

```
Binder
  id, name, description
  coverColor, coverImagePath, coverPattern, coverPreset
  createdAt, updatedAt

Page
  id, binderId (FK → Binder, CASCADE DELETE)
  pageNumber, position, name
  imagePath, rawAiOutput, processedAt, status
  cols, rows
  createdAt

BinderCard
  id, binderId (FK → Binder, CASCADE DELETE)
  pageId (FK → Page, SET NULL on delete) — nullable
  tcgApiId, name, setId, setName, collectorNumber, rarity, year
  imageUrl
  priceLow, priceMid, priceMarket, priceHigh, priceUpdatedAt
  quantity, condition, tradeList, position
  createdAt, updatedAt
```

Key design decisions:
- `pageId` is nullable — cards can exist in a binder without belonging to a page.
- `priceMarket` is the canonical value used for all binder total calculations.
- Prices are denormalized onto the card row and refreshed on demand.
- `position` on `BinderCard` controls slot order within a page grid.
- `cols` and `rows` on `Page` define the grid dimensions shown in the page detail view.

The Prisma schema at `prisma/schema.prisma` mirrors this structure and is used only in web dev mode. The Electron production path uses raw better-sqlite3 SQL in `electron/db.js`.

---

## Image Storage and Serving

Storage paths differ by runtime mode:

| Mode | Upload directory | DB imagePath value | Served via |
|---|---|---|---|
| Electron | `{userData}/uploads/{binderId}/` | `uploads/{binderId}/{file}` | `app://./uploads/...` protocol |
| Web dev | `public/uploads/{binderId}/` | `/uploads/{binderId}/{file}` | Next.js static files |

Cover images follow the same pattern under `covers/` instead of `uploads/`.

`src/lib/storage.ts` (`getUploadDir`, `getImageServingPath`, `resolveImagePath`) centralises the path logic for the Next.js/Prisma code path. The Electron main process has its own equivalent path logic inline in `main.js`.

---

## Settings

User settings (API keys) are stored via `electron-store` in the OS user data directory (not the SQLite database). They are read in the main process and injected into scanner/TCG calls at runtime. The renderer can read and write them via `getSettings` / `saveSettings` IPC calls.

Required: `geminiApiKey` (Google AI Studio)
Optional: `pokemonTcgApiKey` (removes rate limits on pokemontcg.io)

---

## Build and Distribution

- `npm run electron:build` runs `next build` (static export) then `electron-builder --win`
- Output: `dist/` directory containing an NSIS Windows installer
- `asar: false` — files are not packed into an asar archive (required for better-sqlite3 native module)
- The built app bundles: `electron/`, `out/` (Next.js static export), and required native node_modules

## Gaps / Unknowns
- No offline fallback if Gemini or TCG API is unreachable
- Auto-update mechanism not confirmed
