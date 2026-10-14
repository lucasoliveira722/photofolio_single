# Photography Portfolio Site — Phase 1 Design

**Date:** 2026-10-13
**Status:** Approved for implementation planning

> **Update:** the Express API described below was removed — see `2026-10-13-remove-express-api-design.md`.

## Purpose

Build a public-facing website for a photographer: a landing page, a
`/portfolio` page that browses categorized work, and a `/sale` page that
exists as a placeholder for a future selling feature. This is **Phase 1** of
a two-phase project:

- **Phase 1 (this spec):** data model, backend API, the three public pages,
  and a seed script so real photos can be loaded without an admin UI.
- **Phase 2 (future spec):** an authenticated admin UI (login, category and
  image CRUD, upload forms) replacing the seed script as the way content
  gets added. Not designed here — this spec's data model and API should not
  need to change to support it, but the admin UI itself is out of scope.

The `/sale` page is a route placeholder only in this phase — no data model,
no checkout, no pricing. It renders a simple "coming soon" message.

## Stack decisions

- **Frontend:** existing Next.js 16 / React 19 / Tailwind v4 app at
  `front/photofolio` (App Router, Server Components by default).
- **Backend:** existing Express app at `back/`, kept as a distinct API layer
  rather than folding into Next.js API routes/server actions. Plain
  JavaScript (ESM), consistent with the current `back/package.json` — no
  TypeScript conversion in this phase.
- **Data + storage:** Supabase, used directly via `@supabase/supabase-js`
  from Express (no ORM). Supabase provides both the Postgres database and
  the object storage for image files; Supabase Auth/Postgres are not used
  for anything else in Phase 1 (no admin auth yet).
- **Version control:** single git repo at the project root, tracking both
  `back/` and `front/` (set up as part of this work — see commit history).

## Data model

Two Postgres tables in Supabase, plus one Storage bucket.

**`categories`**
| column | type | notes |
|---|---|---|
| `id` | uuid, PK | |
| `slug` | text, unique | URL-safe identifier, e.g. `weddings` |
| `name` | text | display name, e.g. "Weddings" |
| `display_order` | int | controls tab/filter ordering on `/portfolio` |
| `created_at` | timestamptz | default `now()` |

**`images`**
| column | type | notes |
|---|---|---|
| `id` | uuid, PK | |
| `category_id` | uuid, FK → `categories.id` | |
| `storage_path` | text | path within the `portfolio-images` bucket |
| `title` | text | photo name/caption |
| `description` | text, nullable | longer description, shown in the lightbox |
| `display_order` | int | ordering within the category |
| `is_featured` | bool, default `false` | powers the landing-page hero/carousel |
| `width` | int | pixel width, captured at upload time |
| `height` | int | pixel height, captured at upload time |
| `created_at` | timestamptz | default `now()` |

There is no separate `alt_text` column — the `<img>` alt attribute uses
`title`, falling back to `description` if `title` is ever empty.

**Storage bucket:** `portfolio-images`, public-read. These are marketing
photos meant to be publicly visible, so public URLs are appropriate; no
signed-URL logic is needed.

Landing-page copy (hero headline, about blurb, contact/social links) is
**hardcoded in the Next.js codebase**, not stored in the database. It
changes rarely and isn't part of the "feed images into categories"
requirement that justifies the database/storage layer. It can move into the
database later if Phase 2's admin UI decides to manage it.

## Backend API (Express)

Read-only JSON endpoints — no authentication in this phase (write access is
Phase 2's concern):

- `GET /api/categories` — all categories, ordered by `display_order`.
- `GET /api/categories/:slug/images` — images in one category, ordered by
  `display_order`. 404 if the slug doesn't match a category.
- `GET /api/images/featured` — images where `is_featured = true`, for the
  landing hero/carousel.

Every image object in a response includes a resolved `url` field (the public
Supabase Storage URL for `storage_path`) — the frontend never constructs
storage paths or URLs itself, and never talks to Supabase directly.

**Config** (`back/.env`, gitignored):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` — server-side only, never sent to the frontend
- `PORT` — defaults to `4000`

**CORS:** the Next.js dev server (port 3000) and Express (port 4000) are
different origins, so Express needs the `cors` middleware enabled for the
frontend's origin.

**Seed script:** `back/scripts/seed.js`, run via
`npm run seed -- --category=weddings --name="Weddings" --dir=./seed-images/weddings`.
Behavior:
1. Create the category if its slug doesn't already exist.
2. For each image file in `--dir`: read its pixel dimensions, upload it to
   the `portfolio-images` bucket, and insert an `images` row (title
   defaulted from the filename).
3. Print a summary of what was created.

Running the script again with the same category re-uses the existing
category row and appends any new files found; it does not delete or
de-duplicate existing images. Editing a title/description/order before
Phase 2 exists means editing the row directly in Supabase's table editor —
acceptable for this phase since the photographer is the only user.

## Frontend (Next.js)

**Pages:**
- `src/app/page.tsx` (landing) — Server Component. Fetches
  `GET /api/images/featured` for the hero/carousel. Renders the about
  blurb and contact/social links (hardcoded) and nav links to `/portfolio`
  and `/sale`.
- `src/app/portfolio/page.tsx` — Server Component. Fetches
  `GET /api/categories` for the tab list. Reads a `category` search param
  (`?category=<slug>`) to decide which category's images to fetch via
  `GET /api/categories/:slug/images`; defaults to the first category
  (by `display_order`) when the param is absent. Renders category
  tabs/filter buttons (plain links that update the search param — no client
  state needed for the tab switch itself) and the image grid.
- `src/app/sale/page.tsx` — static "coming soon" placeholder. No data
  fetching.

**Shared components:**
- `src/components/ImageGrid.tsx` — responsive grid of `next/image`
  thumbnails. Uses each image's stored `width`/`height` to reserve layout
  space (no layout shift while images load). Clicking a thumbnail opens the
  lightbox at that image's index.
- `src/components/Lightbox.tsx` — Client Component. Full-screen overlay
  showing the full-size image, `title`, `description`, and next/prev
  controls that step through the current list of images (the category's
  images on `/portfolio`, or the featured list on the landing page).
- `src/lib/api.ts` — thin fetch wrapper around the Express base URL (from
  the `API_URL` env var), with a shared error type for failed requests.

**Image optimization:** the Supabase Storage public URL host is added to
`next.config.ts`'s `images.remotePatterns` so `next/image` can optimize
these remote images.

**Error handling:** each page wraps its data fetch in a try/catch and
renders an inline "couldn't load photos right now" message on failure,
rather than throwing into a global error boundary. This keeps a backend
hiccup from taking down the whole page shell (nav, hero text, etc. still
render).

## Testing

- **Frontend:** Vitest + React Testing Library, newly added in this spec
  (no test runner currently exists). Component tests for `ImageGrid`
  (renders the right number of thumbnails, opens the lightbox on click) and
  `Lightbox` (next/prev navigation, closes on escape/overlay click).
- **Backend:** integration tests for the three routes, run against a
  mocked Supabase client (no live network calls in tests) — covers the
  happy path and the 404-on-unknown-slug case for
  `GET /api/categories/:slug/images`.

## Open items / assumptions carried into implementation

- **Deployment target** isn't decided yet. Express needs a persistent host
  (not a serverless platform like Vercel) — e.g. Render, Railway, or Fly.io
  — while the Next.js frontend can deploy to Vercel as usual. This doesn't
  block local development and can be decided when Phase 1 is ready to ship.
- **Backend stays plain JavaScript** per the stack decision above; revisit
  only if Phase 2's larger admin surface makes typing worth the conversion
  cost.
