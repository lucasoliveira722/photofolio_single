# Admin Area — Design

**Date:** 2026-10-14
**Status:** Draft, awaiting the photographer's review

## Purpose

Let the photographer manage the portfolio from the website itself, without
the Supabase dashboard or the seed script. Success means every routine
content change happens in `/admin`:

- upload photos (many at once) into a chosen category
- create, rename, reorder, and delete categories
- edit photo titles and descriptions, move a photo to another category
- reorder photos within a category
- mark or unmark photos as featured (the home hero)
- delete photos

The admin uses the site's aesthetic (warm paper palette, Cormorant Garamond
headings, small uppercase labels). Nothing is copied from the old
`photofolio-front` project's code.

**Out of scope:** a profile/bio editor, password reset from the site (done
in the Supabase dashboard), multiple admins (the `admins` table allows
adding more later without code changes), and any change to the public pages'
look or URLs.

## Decisions

- **Supabase Auth + row-level security, with Next.js server actions acting
  as the signed-in user.** The database, not the website, decides who may
  write. The service-role key stays only in `supabase/.env`; Vercel never
  gets it.
- **Files upload directly from the browser to Supabase Storage**, using the
  signed-in session. Vercel limits request bodies to about 4.5 MB, so files
  must not pass through server actions. Metadata writes go through server
  actions.
- **One admin: the photographer.** The account is created once in the
  Supabase dashboard. There is a login page but no sign-up page.
- **Photos are shrunk in the browser before upload:** longest edge at most
  2560 px, JPEG at quality 0.85, EXIF orientation applied first. Originals
  stay on the photographer's computer.
- **Drag and drop for reordering** photos and categories, with
  `@dnd-kit` (keyboard-accessible).
- **Deleting a category deletes its photos and their stored files**, after
  a confirmation that states the photo count.
- **Renaming a category changes only its display name**; the slug stays,
  so existing `/portfolio?category=` links keep working.

## Database and security (`supabase/`)

### Schema (`schema.sql`)

Add one table:

```sql
create table admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
```

`categories` and `images` are unchanged; they already have every needed
column.

### Policies and functions (`policies.sql`, still re-runnable)

- `is_admin()` — `security definer` SQL function, `stable`, with a fixed
  `search_path`, returning whether `auth.uid()` is in `admins`. RLS is
  enabled on `admins` with no policies, so it is readable only through this
  function.
- `categories`, `images`: keep the public `select` policies. Add `insert`,
  `update`, and `delete` policies for `authenticated` with
  `is_admin()` in `using` / `with check`.
- `storage.objects` in bucket `portfolio-images`: `insert` and `delete`
  for `authenticated` when `is_admin()`. The bucket stays public for reads.
- `reorder_categories(ids uuid[])` and `reorder_images(ids uuid[])` —
  `security invoker` functions that set `display_order` to each id's
  position in the array in one statement, so a reorder never half-applies.
  RLS applies because they run as the caller.

Each `create policy` is preceded by `drop policy if exists`, and functions
use `create or replace`, matching the existing re-runnable style.

### Storage paths

New uploads go to `photos/<uuid>.jpg`. Moving a photo between categories
changes only `images.category_id`; the file does not move. Seeded photos
keep their existing `<slug>/<file>` paths.

## Authentication and routing (`front/photofolio`)

- **Next.js 16 `proxy.ts`** (the renamed middleware) with
  `matcher: ['/admin/:path*', '/login']` refreshes the Supabase session
  cookie, following the `@supabase/ssr` documented pattern. Public pages
  never run it.
- **Cache Components constraint:** reading cookies outside `<Suspense>` is
  a build error, so every session read in admin pages sits inside a
  `<Suspense>` boundary.
- **Route groups:** the public pages move to `src/app/(site)/` with a layout
  that renders `SiteNav`; URLs do not change. `src/app/(admin)/` holds
  `/admin` and `/login` with an admin layout (same fonts and colors; a
  header with "View site" and "Sign out" instead of the side nav). The root
  layout keeps only `<html>`, fonts, and global CSS.
- **`/login`:** email and password form calling Supabase
  `signInWithPassword`; on success it goes to `/admin`. Failure shows
  "Invalid email or password."
- **Admin guard:** a server helper `requireAdmin()` reads the user and
  checks `is_admin()`. Not signed in → redirect to `/login`. Signed in but
  not admin → a plain "This account isn't authorized" view with Sign out
  (Next's `forbidden()` is still experimental in 16.4, so it is not used).
  This is a convenience; RLS is the real protection.
- **Supabase clients:**
  - `src/lib/supabase.ts` — unchanged, public reads only.
  - `src/lib/supabase-server.ts` — new, `createServerClient` from
    `@supabase/ssr` with the request cookies; used by admin pages, server
    actions, and `requireAdmin()`.
  - `src/lib/supabase-browser.ts` — new, `createBrowserClient`; used only
    for Storage uploads and sign-in/out.
- **Environment:** add `NEXT_PUBLIC_SUPABASE_URL` and
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (same values as the existing
  server-only pair) to `.env.example`, `.env.local`, and later Vercel.

## Admin UI

One page, `/admin`, with:

- **Category column (left):** categories in display order, each with its
  photo count. Drag to reorder. Inline rename. Delete with confirmation
  ("Delete *Weddings* and its 12 photos?"). "+ New category" asks for a
  name; the slug is generated from it.
- **Photo area (main):** the selected category's photos in display order
  (selection kept in `?category=<slug>`). An upload drop zone / file picker
  at the top. Photo cards show thumbnail, title, and a ★ featured toggle;
  drag to reorder.
- **Edit panel:** opened by clicking a card. Fields: title (required),
  description, category (dropdown, to move the photo). Save and Delete
  (with confirmation).

### Upload flow (per file, files processed independently)

1. Reject non-images and originals over 50 MB, with a message.
2. **Resizing:** decode with `createImageBitmap(file, { imageOrientation:
   'from-image' })`, scale so the longest edge is at most 2560 px (never
   upscale), encode JPEG quality 0.85 on a canvas. Width and height come
   from the result.
3. **Uploading:** browser client uploads to `photos/<uuid>.jpg`.
4. **Saving:** server action `createImage` inserts the row at the end of
   the category, title from the file name without extension.
5. If step 4 fails, the browser deletes the uploaded file. The card shows
   *failed* with a Retry button. Other files continue.

Statuses shown per file: resizing → uploading → saving → done / failed.

### Feedback

- Reorder and ★ update immediately and roll back with an error message if
  the save fails.
- Edit panel changes save only on Save.
- Public pages read fresh data on every request, so changes appear on the
  next page load without a rebuild.

## Server actions (`src/app/(admin)/admin/actions.ts`)

Each action calls `requireAdmin()`, validates input, and returns
`{ ok: true, ... } | { ok: false, error: string }` instead of throwing.
An expired session returns an error the UI shows with a link to `/login`.

- `createCategory(name)` — slug from name: lowercase, accents stripped
  ("São Paulo" → `sao-paulo`), non-alphanumerics to `-`; if taken, append
  `-2`, `-3`, …; appended at the end of the order.
- `renameCategory(id, name)` — name only.
- `deleteCategory(id)` — collect its images' `storage_path`s, remove them
  from Storage, then delete the category (rows cascade).
- `reorderCategories(ids)` / `reorderImages(ids)` — call the SQL functions.
- `createImage({ categoryId, storagePath, title, width, height })`.
- `updateImage(id, { title, description, categoryId })` — moving to
  another category appends it at the end of that category.
- `setFeatured(id, featured)`.
- `deleteImage(id)` — remove the file, then the row.

After writes, actions call `revalidatePath('/admin')` so the admin view
refreshes.

## Code layout

Pure logic lives in small modules with no Supabase or DOM dependencies:
`src/lib/admin/slug.ts`, `titleFromFilename.ts`, `resize.ts` (dimension
math; the canvas step is a thin wrapper), `reorder.ts` (new id order after
a drag). Admin components live in `src/components/admin/`.

## Testing

Vitest and Testing Library, as now.

- **Pure modules:** slug (accents, symbols, duplicates), title from file
  name, resize dimensions (landscape, portrait, already small), reorder.
- **Server actions:** against a fake Supabase like `api.test.ts` — admin
  check, validation errors, `deleteCategory` removing files, move appends
  to the end, error shape.
- **Components:** login errors, upload status flow including failure and
  retry, edit panel save/cancel, optimistic reorder/featured rollback,
  delete confirmations.
- **RLS on the real project:** a write with the publishable key and no
  session is rejected; the same write signed in as the admin succeeds.
- **In the browser:** sign-in, upload, reorder, edit, move, feature, and
  delete in the dev server. The photographer types the password; Claude
  does not.

## One-time setup (photographer)

1. In the Supabase SQL editor, run the new `create table admins` statement
   from `schema.sql`, then the whole `policies.sql`.
2. Create the account in Supabase → Authentication → Users.
3. Insert that user's id into `admins`.
4. Add the two `NEXT_PUBLIC_*` variables to `front/photofolio/.env.local`
   (and to Vercel at deploy time).

CLAUDE.md's "Going live" section is updated with these steps.
