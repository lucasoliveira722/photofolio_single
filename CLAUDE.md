# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

Two independent parts with no shared tooling or build step:

- `front/photofolio/` — the Next.js site. It reads Supabase directly from server code via `src/lib/api.ts` (built on the server-only client in `src/lib/supabase.ts`), using the project's public anon/publishable key. There is no separate API server.
- `supabase/` — database and content tooling, not deployed: `schema.sql` (tables), `policies.sql` (row-level security: public read, writes only via the service-role key), and the seed script that uploads photos. It is the only place the service-role key is used.

There is no root-level `package.json`, workspace config, or shared CI — each part is installed and run from its own directory.

## Commands

Frontend, from `front/photofolio/` (needs `.env.local` with `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` — see `.env.example`):

```bash
cd front/photofolio
npm install
npm run dev     # next dev — Turbopack dev server on http://localhost:3000
npm run build   # next build
npm run start   # next start (serve production build)
npm run lint    # eslint (flat config in eslint.config.mjs)
npm test        # vitest run
npm run gen:types  # regenerate src/lib/database.types.ts from the live schema (needs `npx supabase login` once)
```

Seed tooling, from `supabase/` (needs `.env` with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` — see `.env.example`):

```bash
cd supabase
npm install
npm test
npm run seed -- --category=<slug> --dir=<path> [--name="<Display Name>"]   # --name only when creating the category
```

## Going live

- Run `supabase/policies.sql` in the Supabase SQL editor before the site is public. Without it, row-level security is off and the publishable key shipped to the frontend can write to the tables. The script is safe to re-run.
- The deployed frontend (e.g. Vercel, Root Directory `front/photofolio`) gets only `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. Never give it `SUPABASE_SERVICE_ROLE_KEY`; that key bypasses RLS and stays in `supabase/.env`.
- After changing `schema.sql`, apply it to the project and run `npm run gen:types` in `front/photofolio` so `database.types.ts` matches.

## Frontend architecture (`front/photofolio`)

- Next.js **16.4.0** on the App Router, React **19.3**, TypeScript, Tailwind CSS **v4**. Source lives under `src/app/` (`layout.tsx`, `page.tsx`, `globals.css`); `@/*` resolves to `./src/*` (see `tsconfig.json`).
- Tailwind v4 is wired in via the Turbopack loader directly in `next.config.ts` (`turbopack.rules["*.css"]`), not a separate PostCSS config — if Tailwind stops applying, check that block first.
- `next.config.ts` opts into several non-default features that affect how code should be written:
  - `reactCompiler: true` (with `babel-plugin-react-compiler` in devDependencies) — manual memoization (`useMemo`/`useCallback`/`React.memo`) is largely unnecessary; let the compiler handle it.
  - `cacheComponents: true` and `partialPrefetching: true` — these are cache/prefetch behaviors specific to recent Next.js versions and may differ from older Next.js knowledge; verify against the installed version's docs rather than assuming older App Router semantics.
  - `experimental.agentFeedback: true`.
- `AGENTS.md` in `front/photofolio/` is **auto-generated and re-written by `next dev`** (see `node_modules/next/dist/server/lib/generate-agent-files.js`). Its instruction: because this Next.js version may have breaking changes vs. training data, consult `node_modules/next/dist/docs/` before relying on prior Next.js knowledge for this project. Don't hand-edit that file's content expecting it to stick — removing it from a diff just re-creates the change on next `next dev` run; if it's checked in, commit it as-is.
- ESLint uses the flat-config format (`eslint.config.mjs`) extending `eslint-config-next`'s `core-web-vitals` and `typescript` rule sets.
