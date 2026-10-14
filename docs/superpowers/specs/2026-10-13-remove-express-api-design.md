# Remove the Express API — Design

**Date:** 2026-10-13
**Status:** Approved for implementation planning
**Supersedes:** the "Backend API (Express)" section of
`2026-10-13-portfolio-site-phase1-design.md`

## Purpose

Phase 1 shipped with a separate Express API between Next.js and Supabase.
That API is a thin read-only layer: three endpoints that query Supabase and
attach public Storage URLs. Removing it leaves one deployable app
(Next.js) plus Supabase, drops a network hop, and avoids hosting a second
service.

**Unchanged for visitors:** the same pages, behavior, and error handling —
including the "Category not found" message for an unknown `?category=`.

**Out of scope:** caching the data reads, Phase 2 admin/auth, any UI change.

## Decisions

- **Next.js reads Supabase directly** with `@supabase/supabase-js` from
  server code, rather than re-creating the endpoints as Next.js route
  handlers (that would keep the extra hop this change exists to remove).
- **The website uses the public key, protected by row-level security.**
  The secret (service-role) key is used only by the seed script on the
  photographer's machine. The site never holds a key that can write.
- **The seed script stays in its own small package**, `supabase/` at the
  repo root (renamed from `back/`), so the secret key lives in a different
  folder from the website's configuration.

## Structure

```
supabase/                      (was back/, stripped down)
  schema.sql                   moved from back/supabase/schema.sql
  policies.sql                 NEW — row-level security + public read
  scripts/seed.js
  scripts/seedPlan.js
  test/seedPlan.test.js
  src/supabaseClient.js        used by the seed script
  src/constants.js             IMAGE_BUCKET, used by the seed script
  package.json                 deps: @supabase/supabase-js, dotenv, image-size; dev: vitest
  .env.example                 SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

front/photofolio/src/lib/
  supabase.ts                  NEW — server-only Supabase client (public key)
  api.ts                       same exports; now queries Supabase
```

**Deleted:** `back/src/app.js`, `back/src/server.js`, `back/src/routes/`,
`back/src/mappers.js`, the route tests (`health`, `categories`,
`categoryImages`, `images`, `app`), the `start` script, the `express`,
`cors` and `supertest` dependencies, and the `PORT` / `CORS_ORIGIN`
settings.

`supabase/package.json` keeps the `test` and `seed` scripts; the seed
command is unchanged apart from the folder:
`cd supabase && npm run seed -- --category=<slug> --dir=<path> [--name="<Display Name>"]`.

## Security — `supabase/policies.sql`

Run once in the Supabase SQL editor (the tables were created without
row-level security, so until this runs, anyone with the public key can read
**and write** them through Supabase's Data API):

- `alter table ... enable row level security` on `categories` and `images`.
- One `select` policy per table allowing the `anon` and `authenticated`
  roles to read all rows.
- No insert/update/delete policies. Writes only work with the service-role
  key, which bypasses row-level security.

Storage needs no change: `storage.objects` has row-level security on by
default, and the public `portfolio-images` bucket only allows downloads.

## Frontend data layer

**Environment** (`front/photofolio/.env.local`; in Vercel later):
`SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` (the project's anon /
publishable key). Neither is prefixed `NEXT_PUBLIC_`, so they stay on the
server. `API_URL` is removed.

**`src/lib/supabase.ts`**
- First line `import 'server-only'` — the build fails if a Client Component
  ever imports it.
- Exports `getSupabase()`, which builds one client from the two variables
  (module-level singleton) with `auth: { persistSession: false }`.
- Throws `Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY` if either is
  unset.

**`src/lib/api.ts`** keeps its public surface exactly: types `Category`
and `PortfolioImage`, class `ApiError` (with `status`), and
`getCategories()`, `getCategoryImages(slug)`, `getFeaturedImages()`, with
the same signatures. Client components keep importing only types from it.

- `getCategories()` — select from `categories` ordered by `display_order`
  ascending; map rows to `{ id, slug, name, displayOrder }`.
- `getCategoryImages(slug)` — look up the category id by slug
  (`maybeSingle`). None found → `throw new ApiError('Category not found:
  <slug>', 404)`. Otherwise select its images ordered by `display_order`
  and map each row, resolving `url` via
  `storage.from('portfolio-images').getPublicUrl(storage_path)`.
- `getFeaturedImages()` — select images where `is_featured = true`,
  ordered by `display_order`, mapped the same way.
- Any Supabase `error` → `throw new ApiError(<message>, 500)`. The pages'
  existing try/catch turns this into "Couldn't load photos right now."

Row mapping (`mapCategory`, `mapImage`) moves from the backend into
`api.ts` as unexported TypeScript helpers producing exactly today's shapes.

**Rendering:** supabase-js reads over `fetch`, which `cacheComponents`
treats as uncached data, so the existing `<Suspense>` structure in
`FeaturedHero` / `PortfolioGallery` stays as is and pages render per
request, as today.

## Testing

- `src/lib/api.test.ts` is rewritten. It mocks `@/lib/supabase`'s
  `getSupabase()` with a fake client (ported from the backend route tests)
  and covers:
  - categories are mapped and requested in `display_order`;
  - category images are mapped with resolved public URLs;
  - an unknown slug rejects with `ApiError` status 404;
  - a Supabase error rejects with `ApiError` status 500;
  - featured images are mapped with URLs.
- New `src/lib/supabase.test.ts`: a missing env var throws the clear error;
  both present returns a client.
- `vitest.setup.ts` mocks `server-only` (it throws outside Next's server
  build).
- Component and page tests are unchanged.
- The rewritten tests are written and seen failing before `api.ts` changes.
- `supabase/test/seedPlan.test.js` moves unchanged and still passes.

## Deployment precautions

- In Vercel, set the project's **Root Directory** to `front/photofolio`;
  nothing in `supabase/` is built or served.
- Vercel gets only `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` — never
  `SUPABASE_SERVICE_ROLE_KEY`.
- `supabase/.env` is gitignored by the root `.gitignore` (`.env` rule;
  verified with `git check-ignore`).
- If the service-role key ever leaks, rotate it in the Supabase dashboard.
- `policies.sql` must have been run before the site goes public.

## Documentation

- `CLAUDE.md`: describe `supabase/` (schema, policies, seed) instead of the
  Express backend; remove Express commands.
- Both `.env.example` files updated as above.
- The Phase 1 spec gets a one-line note at the top pointing here; the
  Phase 1 plan stays as history.

## Done when

1. `supabase/` and `front/photofolio` test suites pass; frontend lint is
   clean; `next build` succeeds.
2. `npm run seed` works from `supabase/`.
3. Against the real project with no API running: `/`, `/portfolio`
   (including the lightbox), and `/sale` work, and a made-up `?category=`
   shows "Category not found".
4. An insert into `categories` using the public key is rejected.
5. `back/` no longer exists.
