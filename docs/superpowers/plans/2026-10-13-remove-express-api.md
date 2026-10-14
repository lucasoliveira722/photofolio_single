# Remove the Express API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Next.js app read Supabase directly through `src/lib/api.ts`, then delete the Express API and keep only the seed tooling in a `supabase/` package.

**Architecture:** A new server-only module `src/lib/supabase.ts` builds a Supabase client from the public (anon/publishable) key; `src/lib/api.ts` keeps its exact exports but queries Supabase instead of fetching the Express API. Row-level security policies make the public key read-only. `back/` is renamed to `supabase/` and stripped to schema, policies, and the seed script.

**Tech Stack:** Next.js 16 / React 19 / TypeScript, `@supabase/supabase-js` v2, `server-only`, Vitest + React Testing Library; Node ESM for the seed package.

**Spec:** `docs/superpowers/specs/2026-10-13-remove-express-api-design.md`

## Global Constraints

- `api.ts` public surface is unchanged: types `Category`, `PortfolioImage`; class `ApiError` (with `status: number`); `getCategories(): Promise<Category[]>`, `getCategoryImages(slug: string): Promise<PortfolioImage[]>`, `getFeaturedImages(): Promise<PortfolioImage[]>`.
- Frontend env vars: `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` — never prefixed `NEXT_PUBLIC_`. `API_URL` is removed.
- `src/lib/supabase.ts` starts with `import 'server-only'` and throws `Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY environment variables` when either is unset.
- The frontend never uses the service-role key. `SUPABASE_SERVICE_ROLE_KEY` exists only in `supabase/.env` (seed script).
- Unknown category slug → `ApiError` with status `404` and message starting `Category not found`. Any Supabase `error` → `ApiError` with status `500`.
- Storage bucket name is `portfolio-images`.
- Seed command is unchanged apart from the folder: `cd supabase && npm run seed -- --category=<slug> --dir=<path> [--name="<Display Name>"]`.
- No UI changes; no caching changes; existing `<Suspense>` structure stays.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

- Missing `SUPABASE_URL`/`SUPABASE_PUBLISHABLE_KEY` at runtime must make the `api.ts` functions **reject** (so the pages' try/catch shows "Couldn't load photos"), not throw synchronously or at import time — pinned in Task 3.
- A database error during the category-by-slug lookup must be a `500`, not a `404` — an outage must not tell visitors "Category not found" — pinned in Task 3.
- Supabase returning `data: null` with no error must yield `[]`, not a crash on `.map` — pinned in Task 3.
- The slug must reach the query verbatim (the old HTTP client `encodeURIComponent`-ed it; carrying that over would break slugs with spaces or `&`) — pinned in Task 3.
- Public URLs must be built from the `portfolio-images` bucket; a wrong bucket name gives silently broken images — pinned in Task 3.

---

## Task 1: Update tests for the renamed site header

The user renamed the site in `SiteHeader.tsx` (commit `2117c6a`) to "Lucas Oliveira Fotografia"; four tests still expect "Your Name Photography". This task restores a green baseline.

**Files:**
- Modify: `front/photofolio/src/components/SiteHeader.test.tsx`
- Modify: `front/photofolio/src/app/portfolio/page.test.tsx`
- Modify: `front/photofolio/src/app/sale/page.test.tsx`

- [ ] **Step 1: Confirm the failures**

Run: `cd front/photofolio && npm test`
Expected: 4 failures — both `SiteHeader` tests and the two "links back to the landing page" tests — each unable to find "Your Name Photography".

- [ ] **Step 2: Update the expected name**

In all three files, replace every occurrence of the string `'Your Name Photography'` with `'Lucas Oliveira Fotografia'`:

```bash
cd front/photofolio
sed -i "s/'Your Name Photography'/'Lucas Oliveira Fotografia'/g" src/components/SiteHeader.test.tsx src/app/portfolio/page.test.tsx src/app/sale/page.test.tsx
grep -rn "Your Name Photography" src
```

Expected: the `grep` prints nothing.

- [ ] **Step 3: Run the suite**

Run: `cd front/photofolio && npm test`
Expected: all 45 tests PASS.

- [ ] **Step 4: Commit**

```bash
git add front/photofolio/src/components/SiteHeader.test.tsx front/photofolio/src/app/portfolio/page.test.tsx front/photofolio/src/app/sale/page.test.tsx
git commit -m "Update tests for the renamed site header"
```

---

## Task 2: Row-level security policies + server-only Supabase client

**Files:**
- Create: `supabase/policies.sql` (the `supabase/` folder is new; Task 4 moves the rest of `back/` into it)
- Create: `front/photofolio/src/lib/supabase.ts`
- Test: `front/photofolio/src/lib/supabase.test.ts`
- Modify: `front/photofolio/vitest.setup.ts`
- Modify: `front/photofolio/package.json`, `front/photofolio/package-lock.json` (via npm)

**Interfaces:**
- Produces: `getSupabase(): SupabaseClient` exported from `front/photofolio/src/lib/supabase.ts` — a module-level singleton. Consumed by Task 3.

- [ ] **Step 1: Write `supabase/policies.sql`**

```sql
-- Run once in the Supabase SQL editor.
-- Makes categories and images readable by anyone and writable only with the
-- service-role key (which bypasses row-level security).

alter table categories enable row level security;
alter table images enable row level security;

create policy "Public can read categories"
  on categories for select
  to anon, authenticated
  using (true);

create policy "Public can read images"
  on images for select
  to anon, authenticated
  using (true);
```

- [ ] **Step 2: Ask the human to run it**

Ask the human to paste the full contents of `supabase/policies.sql` into the Supabase dashboard's SQL Editor and run it, then confirm that Table Editor shows RLS enabled on `categories` and `images`. Wait for confirmation before Task 3's manual check (the code steps below don't depend on it).

- [ ] **Step 3: Install dependencies**

```bash
cd front/photofolio
npm install @supabase/supabase-js server-only
```

- [ ] **Step 4: Mock `server-only` for Vitest**

`server-only` throws when imported outside Next's server build, so tests need a stub. Add this to the end of `front/photofolio/vitest.setup.ts`:

```ts
vi.mock('server-only', () => ({}));
```

- [ ] **Step 5: Write the failing test**

Create `front/photofolio/src/lib/supabase.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('getSupabase', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it('throws a clear error when env vars are missing', async () => {
    vi.stubEnv('SUPABASE_URL', '');
    vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', '');
    const { getSupabase } = await import('./supabase');

    expect(() => getSupabase()).toThrow(
      'Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY environment variables'
    );
  });

  it('returns one shared client when env vars are present', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', 'test-key');
    const { getSupabase } = await import('./supabase');

    const client = getSupabase();

    expect(client.storage).toBeDefined();
    expect(getSupabase()).toBe(client);
  });
});
```

- [ ] **Step 6: Run it and confirm it fails**

Run: `cd front/photofolio && npx vitest run src/lib/supabase.test.ts`
Expected: FAIL — `Failed to resolve import "./supabase"`.

- [ ] **Step 7: Write `front/photofolio/src/lib/supabase.ts`**

```ts
import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | undefined;

export function getSupabase(): SupabaseClient {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY environment variables');
  }

  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}
```

- [ ] **Step 8: Run the test and the full suite**

Run: `cd front/photofolio && npx vitest run src/lib/supabase.test.ts`
Expected: PASS (2 tests).

Run: `cd front/photofolio && npm test`
Expected: all tests PASS (47).

- [ ] **Step 9: Commit**

```bash
git add supabase/policies.sql front/photofolio/src/lib/supabase.ts front/photofolio/src/lib/supabase.test.ts front/photofolio/vitest.setup.ts front/photofolio/package.json front/photofolio/package-lock.json
git commit -m "Add RLS policies and a server-only Supabase client for the frontend"
```

---

## Task 3: Rewrite `api.ts` to query Supabase directly

**Files:**
- Modify: `front/photofolio/src/lib/api.ts`
- Test: `front/photofolio/src/lib/api.test.ts` (full rewrite)
- Modify: `front/photofolio/.env.example`
- Modify (local only, not committed): `front/photofolio/.env.local`

**Interfaces:**
- Consumes: `getSupabase(): SupabaseClient` from `./supabase` (Task 2).
- Produces: unchanged public surface of `api.ts` (see Global Constraints). Pages and components keep working without edits.

- [ ] **Step 1: Write the failing tests**

Replace the entire contents of `front/photofolio/src/lib/api.test.ts` with:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./supabase', () => ({ getSupabase: vi.fn() }));

import { ApiError, getCategories, getCategoryImages, getFeaturedImages } from './api';
import { getSupabase } from './supabase';

type Result = { data: unknown; error: { message: string } | null };

// Mimics supabase-js's query builder: chainable, awaitable, and recording calls.
function fakeQuery(result: Result) {
  const calls: unknown[][] = [];
  const query = {
    calls,
    select: (...args: unknown[]) => {
      calls.push(['select', ...args]);
      return query;
    },
    eq: (...args: unknown[]) => {
      calls.push(['eq', ...args]);
      return query;
    },
    order: (...args: unknown[]) => {
      calls.push(['order', ...args]);
      return query;
    },
    maybeSingle: () => {
      calls.push(['maybeSingle']);
      return Promise.resolve(result);
    },
    then: (resolve: (r: Result) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };
  return query;
}

function fakeSupabase(tables: Record<string, Result>) {
  const queries: Record<string, ReturnType<typeof fakeQuery>> = {};
  const buckets: string[] = [];
  const client = {
    from: (table: string) => {
      if (!(table in tables)) throw new Error(`Unexpected table: ${table}`);
      queries[table] = fakeQuery(tables[table]);
      return queries[table];
    },
    storage: {
      from: (bucket: string) => {
        buckets.push(bucket);
        return {
          getPublicUrl: (path: string) => ({
            data: { publicUrl: `https://example.supabase.co/storage/v1/object/public/${bucket}/${path}` },
          }),
        };
      },
    },
  };
  vi.mocked(getSupabase).mockReturnValue(client as unknown as ReturnType<typeof getSupabase>);
  return { queries, buckets };
}

const imageRow = {
  id: 'img-1',
  category_id: 'cat-1',
  storage_path: 'weddings/a.jpg',
  title: 'A',
  description: null,
  display_order: 0,
  is_featured: true,
  width: 800,
  height: 600,
  created_at: '2026-10-13T00:00:00Z',
};

const mappedImage = {
  id: 'img-1',
  title: 'A',
  description: null,
  displayOrder: 0,
  isFeatured: true,
  width: 800,
  height: 600,
  url: 'https://example.supabase.co/storage/v1/object/public/portfolio-images/weddings/a.jpg',
};

beforeEach(() => {
  vi.mocked(getSupabase).mockReset();
});

describe('getCategories', () => {
  it('returns categories mapped to camelCase, ordered by display_order', async () => {
    const { queries } = fakeSupabase({
      categories: {
        data: [
          { id: '1', slug: 'weddings', name: 'Weddings', display_order: 0 },
          { id: '2', slug: 'portraits', name: 'Portraits', display_order: 1 },
        ],
        error: null,
      },
    });

    const result = await getCategories();

    expect(result).toEqual([
      { id: '1', slug: 'weddings', name: 'Weddings', displayOrder: 0 },
      { id: '2', slug: 'portraits', name: 'Portraits', displayOrder: 1 },
    ]);
    expect(queries.categories.calls).toContainEqual(['order', 'display_order', { ascending: true }]);
  });

  it('rejects with ApiError 500 when Supabase returns an error', async () => {
    fakeSupabase({ categories: { data: null, error: { message: 'db down' } } });

    await expect(getCategories()).rejects.toBeInstanceOf(ApiError);
    await expect(getCategories()).rejects.toMatchObject({ status: 500 });
  });

  it('returns an empty list when Supabase returns no data and no error', async () => {
    fakeSupabase({ categories: { data: null, error: null } });

    await expect(getCategories()).resolves.toEqual([]);
  });

  it('rejects (instead of throwing synchronously) when the client cannot be created', async () => {
    vi.mocked(getSupabase).mockImplementation(() => {
      throw new Error('Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY environment variables');
    });

    await expect(getCategories()).rejects.toThrow(/Missing SUPABASE_URL/);
  });
});

describe('getCategoryImages', () => {
  it('returns the category images with public URLs from the portfolio-images bucket', async () => {
    const { queries, buckets } = fakeSupabase({
      categories: { data: { id: 'cat-1' }, error: null },
      images: { data: [imageRow], error: null },
    });

    const result = await getCategoryImages('weddings');

    expect(result).toEqual([mappedImage]);
    expect(queries.categories.calls).toContainEqual(['eq', 'slug', 'weddings']);
    expect(queries.images.calls).toContainEqual(['eq', 'category_id', 'cat-1']);
    expect(queries.images.calls).toContainEqual(['order', 'display_order', { ascending: true }]);
    expect(buckets).toEqual(['portfolio-images']);
  });

  it('passes the slug to the query verbatim', async () => {
    const { queries } = fakeSupabase({
      categories: { data: { id: 'cat-1' }, error: null },
      images: { data: [], error: null },
    });

    await getCategoryImages('black & white');

    expect(queries.categories.calls).toContainEqual(['eq', 'slug', 'black & white']);
  });

  it('rejects with ApiError 404 for an unknown slug', async () => {
    fakeSupabase({
      categories: { data: null, error: null },
      images: { data: [], error: null },
    });

    const promise = getCategoryImages('unknown');

    await expect(promise).rejects.toBeInstanceOf(ApiError);
    await expect(promise).rejects.toMatchObject({ status: 404, message: expect.stringMatching(/^Category not found/) });
  });

  it('rejects with ApiError 500, not 404, when the category lookup fails', async () => {
    fakeSupabase({
      categories: { data: null, error: { message: 'db down' } },
      images: { data: [], error: null },
    });

    await expect(getCategoryImages('weddings')).rejects.toMatchObject({ status: 500 });
  });

  it('rejects with ApiError 500 when the images query fails', async () => {
    fakeSupabase({
      categories: { data: { id: 'cat-1' }, error: null },
      images: { data: null, error: { message: 'db down' } },
    });

    await expect(getCategoryImages('weddings')).rejects.toMatchObject({ status: 500 });
  });
});

describe('getFeaturedImages', () => {
  it('returns featured images ordered by display_order, with public URLs', async () => {
    const { queries } = fakeSupabase({ images: { data: [imageRow], error: null } });

    const result = await getFeaturedImages();

    expect(result).toEqual([mappedImage]);
    expect(queries.images.calls).toContainEqual(['eq', 'is_featured', true]);
    expect(queries.images.calls).toContainEqual(['order', 'display_order', { ascending: true }]);
  });

  it('rejects with ApiError 500 when Supabase returns an error', async () => {
    fakeSupabase({ images: { data: null, error: { message: 'db down' } } });

    await expect(getFeaturedImages()).rejects.toMatchObject({ status: 500 });
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `cd front/photofolio && npx vitest run src/lib/api.test.ts`
Expected: FAIL — the current `api.ts` calls `fetch` against `API_URL` (unset under Vitest), so every test fails with `Missing API_URL environment variable` or an assertion mismatch. None may pass.

- [ ] **Step 3: Rewrite `front/photofolio/src/lib/api.ts`**

Replace the entire file with:

```ts
import { getSupabase } from './supabase';

export type Category = {
  id: string;
  slug: string;
  name: string;
  displayOrder: number;
};

export type PortfolioImage = {
  id: string;
  title: string;
  description: string | null;
  displayOrder: number;
  isFeatured: boolean;
  width: number;
  height: number;
  url: string;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const IMAGE_BUCKET = 'portfolio-images';

type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  display_order: number;
};

type ImageRow = {
  id: string;
  storage_path: string;
  title: string;
  description: string | null;
  display_order: number;
  is_featured: boolean;
  width: number;
  height: number;
};

function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    displayOrder: row.display_order,
  };
}

function mapImage(row: ImageRow): PortfolioImage {
  const { data } = getSupabase().storage.from(IMAGE_BUCKET).getPublicUrl(row.storage_path);
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    displayOrder: row.display_order,
    isFeatured: row.is_featured,
    width: row.width,
    height: row.height,
    url: data.publicUrl,
  };
}

function loadFailed(what: string, error: { message: string }): never {
  throw new ApiError(`Failed to load ${what}: ${error.message}`, 500);
}

export async function getCategories(): Promise<Category[]> {
  const { data, error } = await getSupabase()
    .from('categories')
    .select('id, slug, name, display_order')
    .order('display_order', { ascending: true });

  if (error) loadFailed('categories', error);
  return ((data ?? []) as CategoryRow[]).map(mapCategory);
}

export async function getCategoryImages(slug: string): Promise<PortfolioImage[]> {
  const supabase = getSupabase();

  const { data: category, error: categoryError } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  if (categoryError) loadFailed('category', categoryError);
  if (!category) throw new ApiError(`Category not found: ${slug}`, 404);

  const { data, error } = await supabase
    .from('images')
    .select('*')
    .eq('category_id', category.id)
    .order('display_order', { ascending: true });

  if (error) loadFailed('images', error);
  return ((data ?? []) as ImageRow[]).map(mapImage);
}

export async function getFeaturedImages(): Promise<PortfolioImage[]> {
  const { data, error } = await getSupabase()
    .from('images')
    .select('*')
    .eq('is_featured', true)
    .order('display_order', { ascending: true });

  if (error) loadFailed('featured images', error);
  return ((data ?? []) as ImageRow[]).map(mapImage);
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `cd front/photofolio && npx vitest run src/lib/api.test.ts`
Expected: PASS (11 tests).

Run: `cd front/photofolio && npm test`
Expected: all tests PASS. The page/component tests mock `@/lib/api` or import only its types, so they are unaffected.

- [ ] **Step 5: Type-check, lint, and build**

```bash
cd front/photofolio
npx tsc --noEmit
npm run lint
npm run build
```

Expected: `tsc` prints nothing; lint reports 0 errors and 0 warnings; build succeeds with `/` and `/portfolio` as `◐` (partial prerender) and `/sale` as `○`.

- [ ] **Step 6: Update the env files**

Replace `front/photofolio/.env.example` with:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your-anon-or-publishable-key
```

For `front/photofolio/.env.local` (gitignored — never commit it): ask the human for their project's anon/publishable key (Supabase dashboard → Project Settings → API). Take `SUPABASE_URL` from `back/.env`. Write `.env.local` as:

```
SUPABASE_URL=<value from back/.env>
SUPABASE_PUBLISHABLE_KEY=<key the human provided>
```

Confirm with `git status --short --ignored front/photofolio | grep env` that `.env.local` shows as `!!` (ignored).

- [ ] **Step 7: Manual check against the real project, with no API running**

Requires Task 2 Step 2 (policies run) to be confirmed. Make sure nothing listens on port 4000, then:

```bash
cd front/photofolio
npm run build
npx next start -p 3000
```

In another terminal:

```bash
curl -s localhost:3000/ | grep -c "Couldn"
curl -s localhost:3000/portfolio | grep -c "Couldn"
curl -s "localhost:3000/portfolio?category=does-not-exist" | grep -o "Category not found"
```

Expected: the first two print `0`; the third prints `Category not found`. Then ask the human to open http://localhost:3000 and http://localhost:3000/portfolio in a browser and confirm real photos show and the lightbox opens. Stop the server afterwards.

- [ ] **Step 8: Commit**

```bash
git add front/photofolio/src/lib/api.ts front/photofolio/src/lib/api.test.ts front/photofolio/.env.example
git commit -m "Read portfolio data from Supabase directly instead of the Express API"
```

---

## Task 4: Delete the Express API; move seed tooling to `supabase/`

**Files:**
- Delete: `back/src/app.js`, `back/src/server.js`, `back/src/routes/categories.js`, `back/src/routes/images.js`, `back/src/mappers.js`
- Delete: `back/test/app.test.js`, `back/test/health.test.js`, `back/test/categories.test.js`, `back/test/categoryImages.test.js`, `back/test/images.test.js`
- Move: `back/package.json`, `back/package-lock.json`, `back/.env.example`, `back/scripts/`, `back/src/supabaseClient.js`, `back/src/constants.js`, `back/test/seedPlan.test.js`, `back/test/supabaseClient.test.js` → same paths under `supabase/`
- Move: `back/supabase/schema.sql` → `supabase/schema.sql`
- Modify: `supabase/package.json`, `supabase/.env.example`

**Interfaces:**
- Consumes: nothing from earlier tasks; after Task 3 the frontend no longer calls Express.
- Produces: `supabase/` package with scripts `test` and `seed`.

- [ ] **Step 1: Delete the Express app and its tests**

```bash
git rm back/src/app.js back/src/server.js back/src/routes/categories.js back/src/routes/images.js back/src/mappers.js
git rm back/test/app.test.js back/test/health.test.js back/test/categories.test.js back/test/categoryImages.test.js back/test/images.test.js
```

- [ ] **Step 2: Move the remaining tracked files into `supabase/`**

`supabase/` already exists (it holds `policies.sql` from Task 2).

```bash
mkdir -p supabase/src supabase/test
git mv back/package.json back/package-lock.json back/.env.example supabase/
git mv back/scripts supabase/scripts
git mv back/src/supabaseClient.js back/src/constants.js supabase/src/
git mv back/test/seedPlan.test.js back/test/supabaseClient.test.js supabase/test/
git mv back/supabase/schema.sql supabase/schema.sql
```

- [ ] **Step 3: Move the local secrets file and remove `back/`**

`back/.env` is gitignored and holds the human's real credentials — move it, don't delete it:

```bash
if [ -f back/.env ]; then mv back/.env supabase/.env; fi
git status --short back
rm -rf back
```

Expected: `git status --short back` prints nothing before the `rm` (everything tracked has been moved or deleted; only `node_modules` and untracked leftovers remain). After `rm -rf back`, `ls back` fails with "No such file or directory".

- [ ] **Step 4: Drop the Express dependencies and the start script**

```bash
cd supabase
npm uninstall express cors supertest
```

Then edit `supabase/package.json` so the `scripts` block is exactly:

```json
"scripts": {
  "test": "vitest run",
  "seed": "node scripts/seed.js"
}
```

(remove `"start": "node src/server.js"`). Keep `"type": "module"`.

- [ ] **Step 5: Update `supabase/.env.example`**

Replace its contents with:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

- [ ] **Step 6: Verify**

```bash
cd supabase
npm test
npm run seed
git check-ignore -v .env
grep -rn "express\|cors\|supertest" package.json src scripts test
```

Expected:
- `npm test`: PASS — `seedPlan.test.js` and `supabaseClient.test.js` (9 tests).
- `npm run seed` with no arguments prints the usage line `Usage: npm run seed -- --category=<slug> --dir=<path> [--name="<Display Name>"]` and exits non-zero.
- `git check-ignore` reports the root `.gitignore` `.env` rule.
- `grep` prints nothing.

Optionally ask the human whether to run a real seed into a scratch category to confirm uploads still work from the new folder; skip if they decline.

- [ ] **Step 7: Commit**

```bash
git add -A supabase
git status --short
git commit -m "Remove the Express API; keep seed tooling in supabase/"
```

Before committing, check `git status --short` lists only renames/deletions under `back/` → `supabase/` and the two edited files — and that `supabase/.env` is NOT staged.

---

## Task 5: Documentation and final verification

**Files:**
- Modify: `CLAUDE.md`
- Modify: `docs/superpowers/specs/2026-10-13-portfolio-site-phase1-design.md` (one-line note)

- [ ] **Step 1: Rewrite the layout and commands sections of `CLAUDE.md`**

Replace everything from `## Repository layout` up to (not including) `## Frontend architecture (\`front/photofolio\`)` with:

````markdown
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
```

Seed tooling, from `supabase/` (needs `.env` with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` — see `.env.example`):

```bash
cd supabase
npm install
npm test
npm run seed -- --category=<slug> --dir=<path> [--name="<Display Name>"]   # --name only when creating the category
```

````

- [ ] **Step 2: Add a pointer to the Phase 1 spec**

In `docs/superpowers/specs/2026-10-13-portfolio-site-phase1-design.md`, insert this line directly after the `**Status:** Approved for implementation planning` line, with a blank line before it:

```markdown
> **Update:** the Express API described below was removed — see `2026-10-13-remove-express-api-design.md`.
```

- [ ] **Step 3: Final verification**

```bash
cd front/photofolio && npm test && npm run lint && npm run build
cd ../../supabase && npm test
cd .. && ls back 2>&1; grep -rn "API_URL\|localhost:4000" front/photofolio/src front/photofolio/.env.example CLAUDE.md
```

Expected: frontend tests, lint (0 errors, 0 warnings), and build pass; `supabase` tests pass; `ls back` reports "No such file or directory"; the `grep` prints nothing.

- [ ] **Step 4: Confirm the public key cannot write**

Using the values from `front/photofolio/.env.local`:

```bash
curl -s -X POST "$SUPABASE_URL/rest/v1/categories" \
  -H "apikey: $SUPABASE_PUBLISHABLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"slug":"rls-check","name":"RLS check"}'
```

Expected: an error body with `"code":"42501"` and a message containing `row-level security`. If the insert succeeds instead, `policies.sql` has not been run — stop and tell the human; then delete the `rls-check` row in Table Editor.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md docs/superpowers/specs/2026-10-13-portfolio-site-phase1-design.md
git commit -m "Update docs for the Supabase-direct architecture"
```
