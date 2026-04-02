# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server at http://localhost:3000
npm run build     # Production build (also type-checks)
npm run lint      # ESLint

npx prisma migrate dev --name <name>   # Create and run a new migration
npx prisma generate                    # Regenerate Prisma client after schema changes
npx prisma studio                      # Browse the SQLite database in a GUI
```

No test suite is configured.

## Environment Variables

```
DATABASE_URL=file:./dev.db        # Path to SQLite database file
GEMINI_API_KEY=...                 # Required for card scanning (Google AI Studio)
POKEMON_TCG_API_KEY=              # Optional — removes rate limits on pokemontcg.io
```

## Architecture

This is a Next.js 16 / React 19 App Router application. All data lives in a local SQLite database. There is no authentication.

### Key version quirks

**Prisma 7**: The generated client outputs to `src/generated/prisma/` — import from `@/generated/prisma/client`, not `@prisma/client`. `PrismaClient` requires a driver adapter; see `src/lib/prisma.ts` which uses `@prisma/adapter-better-sqlite3`. After any schema change, run `prisma generate` then `prisma migrate dev`.

**Next.js 16 App Router**: Route handler `params` is a `Promise` — always `await params` before destructuring.

**Tailwind v4 + shadcn v4**: Uses `@import "tailwindcss"` and `oklch()` color values, not the v3 `@tailwind` directives or HSL variables. Toast uses `sonner` (not the deprecated shadcn `toast`).

### Card scanning pipeline

The core feature lives in `src/app/api/binders/[id]/pages/upload/route.ts`. For each uploaded image:

1. File saved to `public/uploads/[binderId]/[filename]` (served as static assets)
2. `src/lib/claude.ts` — reads the file, base64-encodes it, sends to `gemini-2.0-flash` with a structured JSON prompt. Returns `IdentifiedCard[]` with name, set, collector number, condition, notes.
3. `src/lib/pokemon-tcg.ts` — `matchCard()` runs a 3-attempt cascade against `https://api.pokemontcg.io/v2/cards`: (1) name + collector number, (2) name + set name, (3) name only sorted by highest market price. `extractBestPrice()` selects the right TCGPlayer price variant (holofoil/normal/reverse/1st edition) based on Claude's `notes` field.
4. Results written to `BinderCard` rows; `Page.rawAiOutput` stores the raw Claude JSON for debugging misidentifications.

Unmatched cards (TCG API found nothing) are saved with `tcgApiId = "unmatched-{cuid}"` and no pricing data. The route has `export const maxDuration = 120` to handle multi-page uploads.

### Data model

```
Binder (1) → (many) Page
Binder (1) → (many) BinderCard
Page   (1) → (many) BinderCard   (pageId nullable — cards can exist without a page)
```

`BinderCard.priceMarket` is the primary value used for binder totals. Prices are denormalized onto the card row and refreshed on demand via `POST /api/binders/[id]/refresh-prices`.

### Uploaded images

Stored under `public/uploads/` which is gitignored. `identifyCardsOnPage()` constructs the absolute path as `process.cwd()/public` + the relative `imagePath` stored in the DB.
