# Technology Stack
_Last updated: 2026-04-03_

## Summary

OffDex is a hybrid Electron + Next.js desktop application. The Next.js frontend is compiled to a static export (`output: 'export'`) and loaded inside an Electron shell. All data is stored locally in a SQLite database — there is no backend server in production. In development, the Next.js dev server runs on port 3000 and Electron points to it.

## Languages

**Primary:**
- TypeScript 5.x — all Next.js/React source in `src/`
- JavaScript (CommonJS) — all Electron main-process code in `electron/`

**Secondary:**
- CSS — via Tailwind v4 utility classes, no separate `.css` files beyond globals

## Runtime

**Environment:**
- Node.js 20.x (pinned at `C:/Users/danie/node20.19/node-v20.19.0-win-x64`)

**Package Manager:**
- npm (lockfile: `package-lock.json` present)

## Frameworks

**Core:**
- Next.js 16.2.2 — App Router, compiled to static export for Electron
- React 19.2.4 — UI rendering
- Electron 41.1.1 — Desktop shell, IPC bridge, file system access

**UI:**
- Tailwind CSS v4 — uses `@import "tailwindcss"` and `oklch()` colors, not v3 `@tailwind` directives
- shadcn v4.1.2 — component library
- `@base-ui/react` 1.3.0 — additional headless UI primitives
- `lucide-react` 1.7.0 — icon set
- `next-themes` 0.4.6 — dark/light theme switching
- `sonner` 2.0.7 — toast notifications
- `tw-animate-css` 1.4.0 — CSS animation utilities

**Build/Dev:**
- `electron-builder` 26.8.1 — packages app to Windows NSIS installer (`dist/`)
- `concurrently` 9.2.1 — runs Next.js dev server + Electron simultaneously
- `wait-on` 9.0.4 — waits for port 3000 before launching Electron in dev
- `@electron/rebuild` 4.0.3 — rebuilds native modules (better-sqlite3) against Electron's Node ABI
- `@tailwindcss/postcss` v4 — PostCSS integration
- `dotenv` 17.4.0 — loads `.env` for Prisma CLI commands

**Testing:**
- None configured

## Key Dependencies

**Database:**
- `prisma` 7.6.0 + `@prisma/client` 7.6.0 — ORM and schema management
- `@prisma/adapter-better-sqlite3` 7.6.0 — driver adapter bridging Prisma to SQLite
- `better-sqlite3` 12.8.0 — synchronous SQLite native module; used directly in Electron main process (`electron/db.js`) and via Prisma adapter in Next.js

**AI / External APIs:**
- `@google/generative-ai` 0.24.1 — Gemini SDK (used in `src/lib/claude.ts` for the Next.js API path; Electron uses a raw `fetch` call in `electron/scanner.js`)

**Utilities:**
- `zod` 4.3.6 — schema validation (`src/lib/validations.ts`)
- `@paralleldrive/cuid2` 3.3.0 — collision-resistant ID generation
- `clsx` 2.1.1 + `tailwind-merge` 3.5.0 — class name merging utilities (`src/lib/utils.ts`)
- `class-variance-authority` 0.7.1 — variant-based component styling
- `electron-store` 8.2.0 — persistent JSON settings store for Electron (API keys, preferences)

## Configuration

**Environment:**
- `DATABASE_URL=file:./dev.db` — SQLite path for Next.js/Prisma dev mode
- `GEMINI_API_KEY` — Required for card scanning; loaded from `.env` in dev, stored in `electron-store` in Electron production
- `POKEMON_TCG_API_KEY` — Optional; removes rate limits on pokemontcg.io (only used in Next.js path; Electron uses TCGDex which requires no key)
- `ELECTRON_USER_DATA` — Set by Electron main process at startup; redirects DB and upload paths to OS user data directory

**Build:**
- `next.config.ts` — sets `output: 'export'`, `trailingSlash: true`, images unoptimized
- `prisma.config.ts` — points Prisma CLI to `prisma/schema.prisma` and `prisma/migrations/`
- `postcss.config.mjs` — Tailwind v4 PostCSS plugin
- `eslint.config.mjs` — ESLint with `eslint-config-next`

**Prisma:**
- Schema: `prisma/schema.prisma`
- Migrations: `prisma/migrations/`
- Generated client output: `src/generated/prisma/` (import from `@/generated/prisma/client`)

## Platform Requirements

**Development:**
- Windows (tested); Node.js 20.x must be on PATH manually
- Native module rebuild required after `npm install`: `npm run electron:rebuild`

**Production:**
- Windows NSIS installer built via `npm run electron:build` → output in `dist/`
- `asar: false` in electron-builder config (native modules incompatible with asar)
- Database and uploads stored in OS user data directory (`app.getPath('userData')`)

---

*Stack analysis: 2026-04-03*
