# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

Two independent parts with no shared tooling or build step:

- `front/photofolio/` — the Next.js site. Public pages read Supabase from server code via `src/lib/api.ts` (built on the server-only client in `src/lib/supabase.ts`) with the public publishable key. The `/admin` area signs in with Supabase Auth (`@supabase/ssr`): `src/lib/supabase-server.ts` acts as the signed-in user for server actions, `src/lib/supabase-browser.ts` uploads files, and row-level security only lets accounts listed in the `admins` table write. There is no separate API server.
- `supabase/` — database and content tooling, not deployed: `schema.sql` (tables), `policies.sql` (row-level security: public read, writes only via the service-role key), and the seed script that uploads photos. It is the only place the service-role key is used.

There is no root-level `package.json`, workspace config, or shared CI — each part is installed and run from its own directory.

## Commands

Frontend, from `front/photofolio/` (needs `.env.local` with `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — see `.env.example`):

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

- In the Supabase SQL editor, run the `create table admins` and `create table site_profile` (plus its `insert`) statements from `supabase/schema.sql` if those tables don't exist yet, then the whole `supabase/policies.sql`. Without the policies, row-level security is off and the publishable key shipped to the frontend can write. The policies script is safe to re-run.
- Create the photographer's account in Supabase → Authentication → Users, then insert its user id into `admins`. There is no sign-up page; that row is the only way to become an admin.
- The deployed frontend (e.g. Vercel, Root Directory `front/photofolio`) gets only `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and the two `NEXT_PUBLIC_*` copies. Never give it `SUPABASE_SERVICE_ROLE_KEY`; that key bypasses RLS and stays in `supabase/.env`.
- After changing `schema.sql`, apply it to the project and run `npm run gen:types` in `front/photofolio` so `database.types.ts` matches.

## Frontend architecture (`front/photofolio`)

- Next.js **16.4.0** on the App Router, React **19.3**, TypeScript, Tailwind CSS **v4**. Source lives under `src/app/` (`layout.tsx`, `page.tsx`, `globals.css`); `@/*` resolves to `./src/*` (see `tsconfig.json`).
- Tailwind v4 is wired in via the Turbopack loader directly in `next.config.ts` (`turbopack.rules["*.css"]`), not a separate PostCSS config — if Tailwind stops applying, check that block first.
- `next.config.ts` opts into several non-default features that affect how code should be written:
  - `reactCompiler: true` (with `babel-plugin-react-compiler` in devDependencies) — manual memoization (`useMemo`/`useCallback`/`React.memo`) is largely unnecessary; let the compiler handle it.
  - `cacheComponents: true` and `partialPrefetching: true` — these are cache/prefetch behaviors specific to recent Next.js versions and may differ from older Next.js knowledge; verify against the installed version's docs rather than assuming older App Router semantics.
  - `experimental.agentFeedback: true`.
- `AGENTS.md` in `front/photofolio/` is **auto-generated and re-written by `next dev`** (see `node_modules/next/dist/server/lib/generate-agent-files.js`). Its instruction: because this Next.js version may have breaking changes vs. training data, consult `node_modules/next/dist/docs/` before relying on prior Next.js knowledge for this project. Don't hand-edit that file's content expecting it to stick — removing it from a diff just re-creates the change on next `next dev` run; if it's checked in, commit it as-is.
- Route groups: `src/app/(site)/` holds the public pages (with `SiteNav`); `src/app/(admin)/` holds `/login` and `/admin`. `src/proxy.ts` (Next 16's renamed middleware) refreshes the Supabase session only for those two. With Cache Components, anything that reads the session cookie must render inside `<Suspense>`.
- The home page's bio, email, and Instagram live in the single-row `site_profile` table, edited at `/admin/profile`.
- Admin writes go through `src/app/(admin)/admin/actions.ts`; each action calls `requireAdmin()` and returns `{ ok, error }` instead of throwing. Photo files are resized in the browser (`src/lib/admin/shrinkImage.ts`) and uploaded straight to Storage, because Vercel caps request bodies at about 4.5 MB.
- ESLint uses the flat-config format (`eslint.config.mjs`) extending `eslint-config-next`'s `core-web-vitals` and `typescript` rule sets.
