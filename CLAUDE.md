# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

`npm` is not on the default PATH in this environment. Always prefix with the full Node path:

```bash
PATH="/c/Users/danie/node20.19/node-v20.19.0-win-x64:$PATH" npm run electron:dev    # Run app in dev mode (Next.js + Electron)
PATH="/c/Users/danie/node20.19/node-v20.19.0-win-x64:$PATH" npm run electron:build  # Build Windows installer → dist/
PATH="/c/Users/danie/node20.19/node-v20.19.0-win-x64:$PATH" npm run electron:rebuild # Rebuild native modules (better-sqlite3)
PATH="/c/Users/danie/node20.19/node-v20.19.0-win-x64:$PATH" npm run build           # Next.js static export only (also type-checks)
PATH="/c/Users/danie/node20.19/node-v20.19.0-win-x64:$PATH" npm run lint            # ESLint

PATH="/c/Users/danie/node20.19/node-v20.19.0-win-x64:$PATH" npx prisma migrate dev --name <name>   # Create and run a new migration
PATH="/c/Users/danie/node20.19/node-v20.19.0-win-x64:$PATH" npx prisma generate                    # Regenerate Prisma client after schema changes
PATH="/c/Users/danie/node20.19/node-v20.19.0-win-x64:$PATH" npx prisma studio                      # Browse the SQLite database in a GUI
```

To kill stale Next.js dev server processes: `cmd.exe /c "taskkill /F /IM node.exe"`

No test suite is configured.

## Environment Variables

No API keys or environment variables are required to run or build the app. The only variable used during local development is:

```
DATABASE_URL=file:./dev.db        # Path to SQLite database file (dev mode only)
```

## Architecture

This is an **Electron desktop app** for Windows. The UI is built with Next.js 16 / React 19 (App Router) and compiled to a static export (`out/`). In production, Electron serves those static files via a custom `app://` protocol — no web server runs. All data lives in a local SQLite database stored in the OS user-data directory.

There is no authentication and no required internet connection (prices fetch from pokemontcg.io on demand, but the app is otherwise fully offline).

### Key version quirks

**Prisma 7**: The generated client outputs to `src/generated/prisma/` — import from `@/generated/prisma/client`, not `@prisma/client`. `PrismaClient` requires a driver adapter; see `src/lib/prisma.ts` which uses `@prisma/adapter-better-sqlite3`. After any schema change, run `prisma generate` then `prisma migrate dev`.

**Next.js 16 App Router**: Route handler `params` is a `Promise` — always `await params` before destructuring.

**Tailwind v4 + shadcn v4**: Uses `@import "tailwindcss"` and `oklch()` color values, not the v3 `@tailwind` directives or HSL variables. Toast uses `sonner` (not the deprecated shadcn `toast`).

### Electron architecture

All backend logic runs in the Electron main process:
- `electron/main.js` — app entry, IPC handlers, protocol registration, window creation
- `electron/db.js` — SQLite via `better-sqlite3` (synchronous), all CRUD operations
- `electron/tcg.js` — TCGDex (primary, free) + pokemontcg.io (fallback for pricing)
- `electron/preload.js` — exposes `window.electronAPI` to the renderer via `contextBridge`

The renderer (Next.js static export) communicates with the main process exclusively through `window.electronAPI`. TypeScript types for the API are in `src/types/electron.d.ts`.

### Pricing pipeline

When a card is added or prices are refreshed:
1. `electron/tcg.js` `fetchCardPrices(tcgApiId)` tries pokemontcg.io first, then TCGDex as fallback
2. `getFullCardPricing(tcgApiId)` returns all price variants (holofoil, normal, reverse, etc.) plus cardmarket data
3. Prices are denormalized onto the `BinderCard` row; `priceMarket` is used for binder totals
4. No API key is required — pokemontcg.io works unauthenticated (with standard rate limits)

### Data model

```
Binder (1) → (many) Page
Binder (1) → (many) BinderCard
Page   (1) → (many) BinderCard   (pageId nullable — cards can exist without a page)
```

### User data storage

All user data is stored in the OS user-data directory (`app.getPath('userData')`):
- `pokemon-binder.db` — SQLite database
- `uploads/` — card page images and custom card photos
- `covers/` — binder cover images

In dev mode, the app connects to `localhost:3000`. In production, static files are served via `app://` protocol.
