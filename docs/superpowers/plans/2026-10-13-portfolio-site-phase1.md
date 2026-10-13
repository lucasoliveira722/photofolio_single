# Photography Portfolio Site (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Phase 1 of the photography portfolio site: a Supabase-backed categories/images data model, a read-only Express API, and three public Next.js pages (landing, `/portfolio`, `/sale`) with a seed script for loading real photos.

**Architecture:** Next.js (App Router, Server Components) fetches data from a separate Express API over HTTP; Express is the only part of the system that talks to Supabase (Postgres for category/image metadata, Storage for the image files), using the service-role key server-side. A CLI seed script populates Supabase directly, so there's real data to render before the Phase 2 admin UI exists.

**Tech Stack:** Next.js 16 / React 19 / TypeScript / Tailwind v4 (frontend); Express 5 / `@supabase/supabase-js` (backend); Vitest + Supertest + React Testing Library (tests).

**Spec:** `docs/superpowers/specs/2026-10-13-portfolio-site-phase1-design.md`

## Global Constraints

- Backend stays plain JavaScript (ESM, `"type": "module"` in `back/package.json`) — no TypeScript conversion this phase.
- Backend talks to Supabase directly via `@supabase/supabase-js` — no ORM.
- All API routes in this phase are read-only — no authentication, no write endpoints (Phase 2's concern).
- `categories` table columns: `id`, `slug`, `name`, `display_order`, `created_at`.
- `images` table columns: `id`, `category_id`, `storage_path`, `title`, `description`, `display_order`, `is_featured`, `width`, `height`, `created_at`. No `alt_text` column — the `<img>`/`next/image` alt attribute uses `title`.
- Storage bucket name is `portfolio-images`, public-read.
- Landing-page copy (hero headline, about blurb, contact/social links) is hardcoded in the frontend, not stored in Supabase.
- `/sale` is a static "coming soon" placeholder only — no data model, no checkout logic.
- Test runner is Vitest everywhere (+ Supertest for Express route tests, + React Testing Library for components) — no Jest.
- Backend env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PORT` (default `4000`).
- Frontend env var: `API_URL` (server-side only — it's read inside Server Components/route handlers, never sent to the browser, so it must NOT be prefixed `NEXT_PUBLIC_`).

---

## Task 1: Supabase project setup (schema + storage bucket)

This task has no automated tests — it's external dashboard/SQL setup. The deliverable is verified by inspecting the Supabase dashboard directly.

**Files:**
- Create: `back/supabase/schema.sql`

- [ ] **Step 1: Get Supabase credentials**

If a Supabase project doesn't already exist for this site, ask the human to create a free one at https://supabase.com and to provide:
- The **Project URL** (Project Settings → API → Project URL)
- The **`service_role` secret key** (Project Settings → API → Project API keys → `service_role`)

Keep these values on hand — they're used in Task 3, not committed anywhere.

- [ ] **Step 2: Write the schema file**

Create `back/supabase/schema.sql`:

```sql
create table categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table images (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories(id) on delete cascade,
  storage_path text not null,
  title text not null,
  description text,
  display_order integer not null default 0,
  is_featured boolean not null default false,
  width integer not null,
  height integer not null,
  created_at timestamptz not null default now()
);

create index images_category_id_idx on images(category_id);
```

- [ ] **Step 3: Run the schema in Supabase**

In the Supabase dashboard, open the SQL Editor, paste the full contents of `back/supabase/schema.sql`, and run it.

- [ ] **Step 4: Create the storage bucket**

In the Supabase dashboard, go to Storage → New bucket. Name it `portfolio-images` and toggle **Public bucket** on.

- [ ] **Step 5: Verify**

In the Table Editor, confirm `categories` and `images` exist with the columns listed above. In Storage, confirm the `portfolio-images` bucket exists and is marked Public.

- [ ] **Step 6: Commit**

```bash
git add back/supabase/schema.sql
git commit -m "Add Supabase schema for categories and images"
```

---

## Task 2: Backend app shell (Express + CORS + health check)

**Files:**
- Modify: `back/package.json`
- Create: `back/src/app.js`
- Create: `back/src/server.js`
- Test: `back/test/health.test.js`

**Interfaces:**
- Produces: default export `app` from `back/src/app.js` (an Express app instance) — consumed by every later route-mounting task and by every backend test via `supertest(app)`.
- Produces: `GET /health` → `200 { "status": "ok" }`.

- [ ] **Step 1: Install dependencies**

```bash
cd back
npm install cors
npm install -D vitest supertest
```

(`express` is already a dependency.) Don't hand-edit the version numbers npm writes into `package.json` — let `npm install` manage those.

- [ ] **Step 2: Add `"type": "module"` and scripts to `back/package.json`**

Edit `back/package.json` to add (alongside the existing `dependencies`):

```json
{
  "type": "module",
  "scripts": {
    "start": "node src/server.js",
    "test": "vitest run",
    "seed": "node scripts/seed.js"
  }
}
```

- [ ] **Step 3: Write the failing test**

Create `back/test/health.test.js`:

```js
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('GET /health', () => {
  it('returns ok status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
```

- [ ] **Step 4: Run the test and confirm it fails**

Run: `cd back && npx vitest run test/health.test.js`
Expected: FAIL (`Cannot find module '../src/app.js'`)

- [ ] **Step 5: Write `back/src/app.js`**

```js
import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

export default app;
```

- [ ] **Step 6: Write `back/src/server.js`**

```js
import app from './app.js';

const port = process.env.PORT || 4000;

app.listen(port, () => {
  console.log(`API listening on port ${port}`);
});
```

- [ ] **Step 7: Run the test and confirm it passes**

Run: `cd back && npx vitest run test/health.test.js`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add back/package.json back/package-lock.json back/src/app.js back/src/server.js back/test/health.test.js
git commit -m "Add Express app shell with CORS and a health check route"
```

---

## Task 3: Supabase client module

**Files:**
- Create: `back/src/supabaseClient.js`
- Create: `back/.env.example`
- Test: `back/test/supabaseClient.test.js`

**Interfaces:**
- Consumes: `app` from Task 2 is unaffected; this task is standalone.
- Produces: `getSupabaseClient(): SupabaseClient` exported from `back/src/supabaseClient.js` — consumed by every route task (4, 5, 6) and the seed script (7).

- [ ] **Step 1: Write the failing test**

Create `back/test/supabaseClient.test.js`:

```js
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('getSupabaseClient', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it('throws when env vars are missing', async () => {
    vi.stubEnv('SUPABASE_URL', '');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    const { getSupabaseClient } = await import('../src/supabaseClient.js');
    expect(() => getSupabaseClient()).toThrow(/Missing SUPABASE_URL/);
  });

  it('returns a client when env vars are present', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-key');
    const { getSupabaseClient } = await import('../src/supabaseClient.js');
    const client = getSupabaseClient();
    expect(client).toBeDefined();
    expect(client.storage).toBeDefined();
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `cd back && npx vitest run test/supabaseClient.test.js`
Expected: FAIL (`Cannot find module '../src/supabaseClient.js'`)

- [ ] **Step 3: Install the Supabase client**

```bash
cd back
npm install @supabase/supabase-js dotenv
```

- [ ] **Step 4: Write `back/src/supabaseClient.js`**

```js
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

let client;

export function getSupabaseClient() {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  }

  client = createClient(url, key);
  return client;
}
```

- [ ] **Step 5: Run the test and confirm it passes**

Run: `cd back && npx vitest run test/supabaseClient.test.js`
Expected: PASS

- [ ] **Step 6: Create `back/.env.example`**

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PORT=4000
```

- [ ] **Step 7: Create the real `back/.env` (not committed)**

Create `back/.env` with the actual values from Task 1, Step 1 (the human-provided Project URL and `service_role` key):

```
SUPABASE_URL=<the real project URL>
SUPABASE_SERVICE_ROLE_KEY=<the real service_role key>
PORT=4000
```

This file is covered by the root `.gitignore`'s `.env` rule — confirm with `git status` that it does NOT show up as untracked/staged before committing this task.

- [ ] **Step 8: Commit**

```bash
git add back/package.json back/package-lock.json back/src/supabaseClient.js back/test/supabaseClient.test.js back/.env.example
git commit -m "Add Supabase client module"
```

---

## Task 4: Response mappers + `GET /api/categories`

**Files:**
- Create: `back/src/mappers.js`
- Create: `back/src/routes/categories.js`
- Modify: `back/src/app.js`
- Test: `back/test/categories.test.js`

**Interfaces:**
- Consumes: `getSupabaseClient()` from Task 3.
- Produces: `mapCategory(row)` exported from `back/src/mappers.js` — a pure function converting a snake_case DB row to `{ id, slug, name, displayOrder }`.
- Produces: Express router default-exported from `back/src/routes/categories.js`, mounted at `/api/categories` — later extended in Task 5.

- [ ] **Step 1: Write the failing test**

Create `back/test/categories.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../src/supabaseClient.js', () => ({ getSupabaseClient: vi.fn() }));

import app from '../src/app.js';
import { getSupabaseClient } from '../src/supabaseClient.js';

function fakeSupabaseFrom(result) {
  return {
    from: () => ({
      select: () => ({
        order: () => Promise.resolve(result),
      }),
    }),
  };
}

describe('GET /api/categories', () => {
  beforeEach(() => {
    getSupabaseClient.mockReset();
  });

  it('returns categories ordered by display_order, mapped to camelCase', async () => {
    getSupabaseClient.mockReturnValue(
      fakeSupabaseFrom({
        data: [
          { id: '1', slug: 'weddings', name: 'Weddings', display_order: 0 },
          { id: '2', slug: 'portraits', name: 'Portraits', display_order: 1 },
        ],
        error: null,
      })
    );

    const res = await request(app).get('/api/categories');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { id: '1', slug: 'weddings', name: 'Weddings', displayOrder: 0 },
      { id: '2', slug: 'portraits', name: 'Portraits', displayOrder: 1 },
    ]);
  });

  it('returns 500 when Supabase returns an error', async () => {
    getSupabaseClient.mockReturnValue(
      fakeSupabaseFrom({ data: null, error: { message: 'db down' } })
    );

    const res = await request(app).get('/api/categories');

    expect(res.status).toBe(500);
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `cd back && npx vitest run test/categories.test.js`
Expected: FAIL (`Cannot find module '../src/routes/categories.js'`)

- [ ] **Step 3: Write `back/src/mappers.js`**

```js
export function mapCategory(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    displayOrder: row.display_order,
  };
}
```

- [ ] **Step 4: Write `back/src/routes/categories.js`**

```js
import { Router } from 'express';
import { getSupabaseClient } from '../supabaseClient.js';
import { mapCategory } from '../mappers.js';

const router = Router();

router.get('/', async (req, res) => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('display_order', { ascending: true });

  if (error) {
    res.status(500).json({ error: 'Failed to load categories' });
    return;
  }

  res.json(data.map(mapCategory));
});

export default router;
```

- [ ] **Step 5: Mount the router in `back/src/app.js`**

Modify `back/src/app.js`:

```js
import express from 'express';
import cors from 'cors';
import categoriesRouter from './routes/categories.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/categories', categoriesRouter);

export default app;
```

- [ ] **Step 6: Run the test and confirm it passes**

Run: `cd back && npx vitest run test/categories.test.js`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add back/src/mappers.js back/src/routes/categories.js back/src/app.js back/test/categories.test.js
git commit -m "Add GET /api/categories endpoint"
```

---

## Task 5: `GET /api/categories/:slug/images`

**Files:**
- Modify: `back/src/mappers.js`
- Create: `back/src/constants.js`
- Modify: `back/src/routes/categories.js`
- Test: `back/test/categoryImages.test.js`

**Interfaces:**
- Consumes: `getSupabaseClient()` from Task 3; the `categories` router from Task 4.
- Produces: `mapImage(row, publicUrl)` added to `back/src/mappers.js` — converts a snake_case `images` row plus a resolved public URL into `{ id, title, description, displayOrder, isFeatured, width, height, url }`. Reused in Task 6.
- Produces: `IMAGE_BUCKET` constant exported from `back/src/constants.js` (`'portfolio-images'`). Reused in Task 6 and Task 7.
- Produces: `GET /api/categories/:slug/images` → `200 [...]` on success, `404 { "error": "..." }` for an unknown slug.

- [ ] **Step 1: Write the failing test**

Create `back/test/categoryImages.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../src/supabaseClient.js', () => ({ getSupabaseClient: vi.fn() }));

import app from '../src/app.js';
import { getSupabaseClient } from '../src/supabaseClient.js';

function fakeSupabase({ categoryResult, imagesResult, publicUrlFn }) {
  return {
    from: (table) => {
      if (table === 'categories') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve(categoryResult),
            }),
          }),
        };
      }
      if (table === 'images') {
        return {
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve(imagesResult),
            }),
          }),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
    storage: {
      from: () => ({
        getPublicUrl: publicUrlFn,
      }),
    },
  };
}

describe('GET /api/categories/:slug/images', () => {
  beforeEach(() => {
    getSupabaseClient.mockReset();
  });

  it('returns images for an existing category, with resolved URLs', async () => {
    getSupabaseClient.mockReturnValue(
      fakeSupabase({
        categoryResult: { data: { id: 'cat-1' }, error: null },
        imagesResult: {
          data: [
            {
              id: 'img-1',
              storage_path: 'weddings/a.jpg',
              title: 'A',
              description: null,
              display_order: 0,
              is_featured: false,
              width: 800,
              height: 600,
            },
          ],
          error: null,
        },
        publicUrlFn: () => ({
          data: { publicUrl: 'https://example.supabase.co/storage/v1/object/public/portfolio-images/weddings/a.jpg' },
        }),
      })
    );

    const res = await request(app).get('/api/categories/weddings/images');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      {
        id: 'img-1',
        title: 'A',
        description: null,
        displayOrder: 0,
        isFeatured: false,
        width: 800,
        height: 600,
        url: 'https://example.supabase.co/storage/v1/object/public/portfolio-images/weddings/a.jpg',
      },
    ]);
  });

  it('returns 404 for an unknown category slug', async () => {
    getSupabaseClient.mockReturnValue(
      fakeSupabase({
        categoryResult: { data: null, error: null },
        imagesResult: { data: [], error: null },
        publicUrlFn: () => ({ data: { publicUrl: '' } }),
      })
    );

    const res = await request(app).get('/api/categories/unknown/images');

    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `cd back && npx vitest run test/categoryImages.test.js`
Expected: FAIL (route returns 404 for everything, or `IMAGE_BUCKET`/`mapImage` don't exist yet)

- [ ] **Step 3: Create `back/src/constants.js`**

```js
export const IMAGE_BUCKET = 'portfolio-images';
```

- [ ] **Step 4: Add `mapImage` to `back/src/mappers.js`**

Add this export alongside the existing `mapCategory`:

```js
export function mapImage(row, publicUrl) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    displayOrder: row.display_order,
    isFeatured: row.is_featured,
    width: row.width,
    height: row.height,
    url: publicUrl,
  };
}
```

- [ ] **Step 5: Add the route to `back/src/routes/categories.js`**

Replace the full contents of `back/src/routes/categories.js` with:

```js
import { Router } from 'express';
import { getSupabaseClient } from '../supabaseClient.js';
import { mapCategory, mapImage } from '../mappers.js';
import { IMAGE_BUCKET } from '../constants.js';

const router = Router();

router.get('/', async (req, res) => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('display_order', { ascending: true });

  if (error) {
    res.status(500).json({ error: 'Failed to load categories' });
    return;
  }

  res.json(data.map(mapCategory));
});

router.get('/:slug/images', async (req, res) => {
  const supabase = getSupabaseClient();
  const { slug } = req.params;

  const { data: category, error: categoryError } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  if (categoryError) {
    res.status(500).json({ error: 'Failed to load category' });
    return;
  }
  if (!category) {
    res.status(404).json({ error: `Category not found: ${slug}` });
    return;
  }

  const { data: images, error: imagesError } = await supabase
    .from('images')
    .select('*')
    .eq('category_id', category.id)
    .order('display_order', { ascending: true });

  if (imagesError) {
    res.status(500).json({ error: 'Failed to load images' });
    return;
  }

  const mapped = images.map((row) => {
    const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(row.storage_path);
    return mapImage(row, data.publicUrl);
  });

  res.json(mapped);
});

export default router;
```

- [ ] **Step 6: Run the test and confirm it passes**

Run: `cd back && npx vitest run test/categoryImages.test.js`
Expected: PASS

- [ ] **Step 7: Run the full backend test suite**

Run: `cd back && npm test`
Expected: all tests PASS (confirms Task 4's route still works alongside the new one)

- [ ] **Step 8: Commit**

```bash
git add back/src/mappers.js back/src/constants.js back/src/routes/categories.js back/test/categoryImages.test.js
git commit -m "Add GET /api/categories/:slug/images endpoint"
```

---

## Task 6: `GET /api/images/featured`

**Files:**
- Create: `back/src/routes/images.js`
- Modify: `back/src/app.js`
- Test: `back/test/images.test.js`

**Interfaces:**
- Consumes: `getSupabaseClient()` from Task 3; `mapImage` from `back/src/mappers.js` and `IMAGE_BUCKET` from `back/src/constants.js`, both from Task 5.
- Produces: Express router default-exported from `back/src/routes/images.js`, mounted at `/api/images`.
- Produces: `GET /api/images/featured` → `200 [...]`, images where `is_featured = true`, ordered by `display_order`.

- [ ] **Step 1: Write the failing test**

Create `back/test/images.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../src/supabaseClient.js', () => ({ getSupabaseClient: vi.fn() }));

import app from '../src/app.js';
import { getSupabaseClient } from '../src/supabaseClient.js';

function fakeSupabase({ imagesResult, publicUrlFn }) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve(imagesResult),
        }),
      }),
    }),
    storage: {
      from: () => ({
        getPublicUrl: publicUrlFn,
      }),
    },
  };
}

describe('GET /api/images/featured', () => {
  beforeEach(() => {
    getSupabaseClient.mockReset();
  });

  it('returns featured images ordered by display_order', async () => {
    getSupabaseClient.mockReturnValue(
      fakeSupabase({
        imagesResult: {
          data: [
            {
              id: 'img-1',
              storage_path: 'weddings/hero.jpg',
              title: 'Hero',
              description: 'A hero shot',
              display_order: 0,
              is_featured: true,
              width: 1600,
              height: 900,
            },
          ],
          error: null,
        },
        publicUrlFn: () => ({
          data: { publicUrl: 'https://example.supabase.co/storage/v1/object/public/portfolio-images/weddings/hero.jpg' },
        }),
      })
    );

    const res = await request(app).get('/api/images/featured');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      {
        id: 'img-1',
        title: 'Hero',
        description: 'A hero shot',
        displayOrder: 0,
        isFeatured: true,
        width: 1600,
        height: 900,
        url: 'https://example.supabase.co/storage/v1/object/public/portfolio-images/weddings/hero.jpg',
      },
    ]);
  });

  it('returns 500 when Supabase returns an error', async () => {
    getSupabaseClient.mockReturnValue(
      fakeSupabase({ imagesResult: { data: null, error: { message: 'db down' } }, publicUrlFn: () => ({ data: { publicUrl: '' } }) })
    );

    const res = await request(app).get('/api/images/featured');

    expect(res.status).toBe(500);
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `cd back && npx vitest run test/images.test.js`
Expected: FAIL (`Cannot find module '../src/routes/images.js'` or 404 from no route mounted)

- [ ] **Step 3: Write `back/src/routes/images.js`**

```js
import { Router } from 'express';
import { getSupabaseClient } from '../supabaseClient.js';
import { mapImage } from '../mappers.js';
import { IMAGE_BUCKET } from '../constants.js';

const router = Router();

router.get('/featured', async (req, res) => {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('images')
    .select('*')
    .eq('is_featured', true)
    .order('display_order', { ascending: true });

  if (error) {
    res.status(500).json({ error: 'Failed to load featured images' });
    return;
  }

  const mapped = data.map((row) => {
    const { data: urlData } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(row.storage_path);
    return mapImage(row, urlData.publicUrl);
  });

  res.json(mapped);
});

export default router;
```

- [ ] **Step 4: Mount the router in `back/src/app.js`**

Replace the full contents of `back/src/app.js` with:

```js
import express from 'express';
import cors from 'cors';
import categoriesRouter from './routes/categories.js';
import imagesRouter from './routes/images.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/categories', categoriesRouter);
app.use('/api/images', imagesRouter);

export default app;
```

- [ ] **Step 5: Run the test and confirm it passes**

Run: `cd back && npx vitest run test/images.test.js`
Expected: PASS

- [ ] **Step 6: Run the full backend test suite**

Run: `cd back && npm test`
Expected: all tests PASS

- [ ] **Step 7: Commit**

```bash
git add back/src/routes/images.js back/src/app.js back/test/images.test.js
git commit -m "Add GET /api/images/featured endpoint"
```

---

## Task 7: Seed script

**Files:**
- Create: `back/scripts/seedPlan.js`
- Create: `back/test/seedPlan.test.js`
- Create: `back/scripts/seed.js`

**Interfaces:**
- Consumes: `getSupabaseClient()` from Task 3, `IMAGE_BUCKET` from Task 5.
- Produces: `parseArgs(argv)`, `titleFromFilename(filename)`, `buildSeedRows(categorySlug, files)` — pure functions exported from `back/scripts/seedPlan.js`, used only by `back/scripts/seed.js`.

- [ ] **Step 1: Write the failing test**

Create `back/test/seedPlan.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { parseArgs, titleFromFilename, buildSeedRows } from '../scripts/seedPlan.js';

describe('parseArgs', () => {
  it('parses --key=value pairs', () => {
    expect(parseArgs(['--category=weddings', '--dir=./photos'])).toEqual({
      category: 'weddings',
      dir: './photos',
    });
  });

  it('ignores malformed args', () => {
    expect(parseArgs(['notanarg'])).toEqual({});
  });
});

describe('titleFromFilename', () => {
  it('strips the extension and title-cases separators', () => {
    expect(titleFromFilename('golden-hour_pier.jpg')).toBe('Golden Hour Pier');
  });
});

describe('buildSeedRows', () => {
  it('builds rows with sequential display order and prefixed storage paths', () => {
    const rows = buildSeedRows('weddings', [
      { filename: 'a.jpg', width: 800, height: 600 },
      { filename: 'b.jpg', width: 1024, height: 768 },
    ]);

    expect(rows).toEqual([
      { storagePath: 'weddings/a.jpg', title: 'A', width: 800, height: 600, displayOrder: 0 },
      { storagePath: 'weddings/b.jpg', title: 'B', width: 1024, height: 768, displayOrder: 1 },
    ]);
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `cd back && npx vitest run test/seedPlan.test.js`
Expected: FAIL (`Cannot find module '../scripts/seedPlan.js'`)

- [ ] **Step 3: Write `back/scripts/seedPlan.js`**

```js
export function parseArgs(argv) {
  const args = {};
  for (const arg of argv) {
    const match = arg.match(/^--([^=]+)=(.*)$/);
    if (match) {
      args[match[1]] = match[2];
    }
  }
  return args;
}

export function titleFromFilename(filename) {
  const base = filename.replace(/\.[^.]+$/, '');
  return base.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function buildSeedRows(categorySlug, files) {
  return files.map((file, index) => ({
    storagePath: `${categorySlug}/${file.filename}`,
    title: titleFromFilename(file.filename),
    width: file.width,
    height: file.height,
    displayOrder: index,
  }));
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `cd back && npx vitest run test/seedPlan.test.js`
Expected: PASS

- [ ] **Step 5: Install `image-size`**

```bash
cd back
npm install image-size
```

- [ ] **Step 6: Write `back/scripts/seed.js`**

```js
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import sizeOf from 'image-size';
import { getSupabaseClient } from '../src/supabaseClient.js';
import { IMAGE_BUCKET } from '../src/constants.js';
import { parseArgs, buildSeedRows } from './seedPlan.js';

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { category: slug, name, dir } = args;

  if (!slug || !name || !dir) {
    console.error('Usage: npm run seed -- --category=<slug> --name="<Display Name>" --dir=<path>');
    process.exitCode = 1;
    return;
  }

  const supabase = getSupabaseClient();

  let { data: category } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  if (!category) {
    const { data: created, error } = await supabase
      .from('categories')
      .insert({ slug, name, display_order: 0 })
      .select('id')
      .single();
    if (error) throw error;
    category = created;
    console.log(`Created category "${name}" (${slug})`);
  }

  const filenames = readdirSync(dir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
  const files = filenames.map((filename) => {
    const { width, height } = sizeOf(join(dir, filename));
    return { filename, width, height };
  });

  const rows = buildSeedRows(slug, files);

  for (const row of rows) {
    const filename = row.storagePath.split('/').pop();
    const buffer = readFileSync(join(dir, filename));

    const { error: uploadError } = await supabase.storage
      .from(IMAGE_BUCKET)
      .upload(row.storagePath, buffer, { upsert: false });

    if (uploadError && !uploadError.message.includes('already exists')) {
      throw uploadError;
    }

    const { error: insertError } = await supabase.from('images').insert({
      category_id: category.id,
      storage_path: row.storagePath,
      title: row.title,
      display_order: row.displayOrder,
      width: row.width,
      height: row.height,
    });

    if (insertError) throw insertError;

    console.log(`Seeded ${row.storagePath}`);
  }

  console.log(`Done: ${rows.length} image(s) seeded into "${slug}".`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
```

- [ ] **Step 7: Manually verify against the real Supabase project**

Create a scratch folder (e.g. `back/tmp-seed-sample/`) with 1-2 small `.jpg` files, then run:

```bash
cd back
npm run seed -- --category=test --name="Test" --dir=./tmp-seed-sample
```

Expected console output: a "Created category" line (first run only), one "Seeded ..." line per file, and a "Done: N image(s) seeded" summary. Confirm in the Supabase dashboard that the `test` category, its `images` rows, and the uploaded files under `portfolio-images/test/` all appear. Delete the scratch folder and the test category/images afterward if you don't want test data in the live project.

- [ ] **Step 8: Commit**

```bash
git add back/scripts/seedPlan.js back/scripts/seed.js back/test/seedPlan.test.js back/package.json back/package-lock.json
git commit -m "Add seed script for loading images into a category"
```

---

## Task 8: Frontend test harness (Vitest + React Testing Library)

**Files:**
- Modify: `front/photofolio/package.json`
- Create: `front/photofolio/vitest.config.ts`
- Create: `front/photofolio/vitest.setup.ts`
- Test: `front/photofolio/src/sanity.test.tsx`

**Interfaces:**
- Produces: a working `npm test` command in `front/photofolio`, and a path alias `@/*` → `./src/*` inside Vitest (mirroring the existing `tsconfig.json` alias) that every later frontend test task relies on.

- [ ] **Step 1: Install dependencies**

```bash
cd front/photofolio
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 2: Create `front/photofolio/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(dirname, './src'),
    },
  },
});
```

- [ ] **Step 3: Create `front/photofolio/vitest.setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 4: Add the `test` script to `front/photofolio/package.json`**

Add to the existing `scripts` block:

```json
"test": "vitest run"
```

- [ ] **Step 5: Write `front/photofolio/src/sanity.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

function Greeting() {
  return <p>hello from vitest</p>;
}

describe('test harness sanity check', () => {
  it('renders with React Testing Library in a jsdom environment', () => {
    render(<Greeting />);
    expect(screen.getByText('hello from vitest')).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run the test and confirm it passes**

Run: `cd front/photofolio && npm test`
Expected: PASS — this confirms the Vitest + jsdom + React Testing Library harness is wired correctly end-to-end.

- [ ] **Step 7: Commit**

```bash
git add front/photofolio/package.json front/photofolio/package-lock.json front/photofolio/vitest.config.ts front/photofolio/vitest.setup.ts front/photofolio/src/sanity.test.tsx
git commit -m "Add Vitest and React Testing Library harness to the frontend"
```

---

## Task 9: Frontend API client (`src/lib/api.ts`)

**Files:**
- Create: `front/photofolio/src/lib/api.ts`
- Test: `front/photofolio/src/lib/api.test.ts`
- Create: `front/photofolio/.env.example`

**Interfaces:**
- Produces: types `Category` (`{ id, slug, name, displayOrder }`) and `PortfolioImage` (`{ id, title, description: string | null, displayOrder, isFeatured, width, height, url }`), and functions `getCategories(): Promise<Category[]>`, `getCategoryImages(slug: string): Promise<PortfolioImage[]>`, `getFeaturedImages(): Promise<PortfolioImage[]>`, and error class `ApiError` — all exported from `front/photofolio/src/lib/api.ts`. Consumed by every page and component task from here on.

- [ ] **Step 1: Write the failing test**

Create `front/photofolio/src/lib/api.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getCategories, getCategoryImages, getFeaturedImages, ApiError } from './api';

const originalFetch = global.fetch;
const originalApiUrl = process.env.API_URL;

beforeEach(() => {
  process.env.API_URL = 'http://localhost:4000';
});

afterEach(() => {
  global.fetch = originalFetch;
  process.env.API_URL = originalApiUrl;
});

describe('getCategories', () => {
  it('fetches and returns parsed categories', async () => {
    const categories = [{ id: '1', slug: 'weddings', name: 'Weddings', displayOrder: 0 }];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => categories,
    }) as unknown as typeof fetch;

    const result = await getCategories();

    expect(global.fetch).toHaveBeenCalledWith('http://localhost:4000/api/categories');
    expect(result).toEqual(categories);
  });

  it('throws ApiError when the response is not ok', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    }) as unknown as typeof fetch;

    await expect(getCategories()).rejects.toThrow(ApiError);
  });
});

describe('getCategoryImages', () => {
  it('requests the slug-scoped endpoint', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [] }) as unknown as typeof fetch;

    await getCategoryImages('weddings');

    expect(global.fetch).toHaveBeenCalledWith('http://localhost:4000/api/categories/weddings/images');
  });
});

describe('getFeaturedImages', () => {
  it('requests the featured endpoint', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [] }) as unknown as typeof fetch;

    await getFeaturedImages();

    expect(global.fetch).toHaveBeenCalledWith('http://localhost:4000/api/images/featured');
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `cd front/photofolio && npx vitest run src/lib/api.test.ts`
Expected: FAIL (`Cannot find module './api'`)

- [ ] **Step 3: Write `front/photofolio/src/lib/api.ts`**

```ts
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

function getApiUrl(): string {
  const url = process.env.API_URL;
  if (!url) {
    throw new Error('Missing API_URL environment variable');
  }
  return url;
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${getApiUrl()}${path}`);
  if (!res.ok) {
    throw new ApiError(`Request to ${path} failed with status ${res.status}`, res.status);
  }
  return res.json() as Promise<T>;
}

export function getCategories(): Promise<Category[]> {
  return fetchJson<Category[]>('/api/categories');
}

export function getCategoryImages(slug: string): Promise<PortfolioImage[]> {
  return fetchJson<PortfolioImage[]>(`/api/categories/${encodeURIComponent(slug)}/images`);
}

export function getFeaturedImages(): Promise<PortfolioImage[]> {
  return fetchJson<PortfolioImage[]>('/api/images/featured');
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `cd front/photofolio && npx vitest run src/lib/api.test.ts`
Expected: PASS

- [ ] **Step 5: Create `front/photofolio/.env.example`**

```
API_URL=http://localhost:4000
```

- [ ] **Step 6: Create the real `front/photofolio/.env.local` (not committed)**

```
API_URL=http://localhost:4000
```

Confirm with `git status` that this file does not appear as untracked (the root `.gitignore`'s `.env*.local` rule covers it).

- [ ] **Step 7: Commit**

```bash
git add front/photofolio/src/lib/api.ts front/photofolio/src/lib/api.test.ts front/photofolio/.env.example
git commit -m "Add frontend API client for categories and images"
```

---

## Task 10: `Lightbox` component

**Files:**
- Create: `front/photofolio/src/components/Lightbox.tsx`
- Test: `front/photofolio/src/components/Lightbox.test.tsx`

**Interfaces:**
- Consumes: `PortfolioImage` type from Task 9.
- Produces: default export `Lightbox` from `front/photofolio/src/components/Lightbox.tsx`, props `{ images: PortfolioImage[], index: number, onClose: () => void, onNavigate: (index: number) => void }`. Consumed by `ImageGrid` (Task 11).

- [ ] **Step 1: Write the failing test**

Create `front/photofolio/src/components/Lightbox.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Lightbox from './Lightbox';
import type { PortfolioImage } from '@/lib/api';

const images: PortfolioImage[] = [
  { id: '1', title: 'First', description: 'First desc', displayOrder: 0, isFeatured: false, width: 800, height: 600, url: 'https://example.com/1.jpg' },
  { id: '2', title: 'Second', description: null, displayOrder: 1, isFeatured: false, width: 800, height: 600, url: 'https://example.com/2.jpg' },
];

describe('Lightbox', () => {
  it('renders the image at the given index', () => {
    render(<Lightbox images={images} index={0} onClose={vi.fn()} onNavigate={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'First' })).toBeInTheDocument();
    expect(screen.getByAltText('First')).toHaveAttribute('src', 'https://example.com/1.jpg');
  });

  it('calls onNavigate with the next index when Next is clicked', () => {
    const onNavigate = vi.fn();
    render(<Lightbox images={images} index={0} onClose={vi.fn()} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(onNavigate).toHaveBeenCalledWith(1);
  });

  it('disables Previous on the first image and Next on the last image', () => {
    const { rerender } = render(<Lightbox images={images} index={0} onClose={vi.fn()} onNavigate={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();

    rerender(<Lightbox images={images} index={1} onClose={vi.fn()} onNavigate={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  it('calls onClose when Close is clicked', () => {
    const onClose = vi.fn();
    render(<Lightbox images={images} index={0} onClose={onClose} onNavigate={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `cd front/photofolio && npx vitest run src/components/Lightbox.test.tsx`
Expected: FAIL (`Cannot find module './Lightbox'`)

- [ ] **Step 3: Write `front/photofolio/src/components/Lightbox.tsx`**

```tsx
'use client';

import { useEffect } from 'react';
import type { PortfolioImage } from '@/lib/api';

type LightboxProps = {
  images: PortfolioImage[];
  index: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
};

export default function Lightbox({ images, index, onClose, onNavigate }: LightboxProps) {
  const image = images[index];

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft' && index > 0) onNavigate(index - 1);
      if (event.key === 'ArrowRight' && index < images.length - 1) onNavigate(index + 1);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [index, images.length, onClose, onNavigate]);

  if (!image) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-full max-w-4xl flex-col items-center gap-4"
        onClick={(event) => event.stopPropagation()}
      >
        <img src={image.url} alt={image.title} className="max-h-[75vh] w-auto object-contain" />
        <div className="text-center text-white">
          <h2 className="text-lg font-semibold">{image.title}</h2>
          {image.description && <p className="text-sm text-zinc-300">{image.description}</p>}
        </div>
        <div className="flex gap-4">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => onNavigate(index - 1)}
            className="rounded bg-white/10 px-4 py-2 text-white disabled:opacity-30"
          >
            Previous
          </button>
          <button type="button" onClick={onClose} className="rounded bg-white/10 px-4 py-2 text-white">
            Close
          </button>
          <button
            type="button"
            disabled={index === images.length - 1}
            onClick={() => onNavigate(index + 1)}
            className="rounded bg-white/10 px-4 py-2 text-white disabled:opacity-30"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `cd front/photofolio && npx vitest run src/components/Lightbox.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add front/photofolio/src/components/Lightbox.tsx front/photofolio/src/components/Lightbox.test.tsx
git commit -m "Add Lightbox component"
```

---

## Task 11: `ImageGrid` component

**Files:**
- Create: `front/photofolio/src/components/ImageGrid.tsx`
- Test: `front/photofolio/src/components/ImageGrid.test.tsx`
- Modify: `front/photofolio/vitest.setup.ts`

**Interfaces:**
- Consumes: `Lightbox` from Task 10, `PortfolioImage` type from Task 9.
- Produces: default export `ImageGrid` from `front/photofolio/src/components/ImageGrid.tsx`, props `{ images: PortfolioImage[] }`. Consumed by the `/portfolio` page (Task 16).
- Produces: a global `next/image` mock added to `vitest.setup.ts`, reused by every later component test that renders `next/image` (Task 12).

- [ ] **Step 1: Write the failing test**

Create `front/photofolio/src/components/ImageGrid.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ImageGrid from './ImageGrid';
import type { PortfolioImage } from '@/lib/api';

const images: PortfolioImage[] = [
  { id: '1', title: 'First', description: null, displayOrder: 0, isFeatured: false, width: 800, height: 600, url: 'https://example.com/1.jpg' },
  { id: '2', title: 'Second', description: null, displayOrder: 1, isFeatured: false, width: 800, height: 600, url: 'https://example.com/2.jpg' },
];

describe('ImageGrid', () => {
  it('renders one thumbnail per image', () => {
    render(<ImageGrid images={images} />);
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('opens the lightbox at the clicked image index', () => {
    render(<ImageGrid images={images} />);
    fireEvent.click(screen.getByAltText('Second'));
    expect(screen.getByRole('heading', { name: 'Second' })).toBeInTheDocument();
  });

  it('does not render the lightbox before any thumbnail is clicked', () => {
    render(<ImageGrid images={images} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `cd front/photofolio && npx vitest run src/components/ImageGrid.test.tsx`
Expected: FAIL (`Cannot find module './ImageGrid'`)

- [ ] **Step 3: Add a `next/image` mock to `vitest.setup.ts`**

Next's `next/image` component needs Next's own runtime context to resolve its optimizer, which isn't present under plain Vitest+jsdom. Replace `front/photofolio/vitest.setup.ts` with:

```ts
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
import React from 'react';
import type { ImageProps } from 'next/image';

vi.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...rest }: ImageProps) =>
    React.createElement('img', { src: typeof src === 'string' ? src : '', alt, ...rest }),
}));
```

- [ ] **Step 4: Write `front/photofolio/src/components/ImageGrid.tsx`**

```tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';
import Lightbox from './Lightbox';
import type { PortfolioImage } from '@/lib/api';

type ImageGridProps = {
  images: PortfolioImage[];
};

export default function ImageGrid({ images }: ImageGridProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {images.map((image, index) => (
          <button
            key={image.id}
            type="button"
            onClick={() => setOpenIndex(index)}
            className="relative aspect-square overflow-hidden rounded"
          >
            <Image
              src={image.url}
              alt={image.title}
              width={image.width}
              height={image.height}
              className="h-full w-full object-cover"
              sizes="(max-width: 768px) 50vw, 25vw"
            />
          </button>
        ))}
      </div>
      {openIndex !== null && (
        <Lightbox images={images} index={openIndex} onClose={() => setOpenIndex(null)} onNavigate={setOpenIndex} />
      )}
    </>
  );
}
```

- [ ] **Step 5: Run the test and confirm it passes**

Run: `cd front/photofolio && npx vitest run src/components/ImageGrid.test.tsx`
Expected: PASS

- [ ] **Step 6: Run the full frontend test suite**

Run: `cd front/photofolio && npm test`
Expected: all tests PASS (confirms the `next/image` mock didn't break the Task 8/9/10 tests)

- [ ] **Step 7: Commit**

```bash
git add front/photofolio/src/components/ImageGrid.tsx front/photofolio/src/components/ImageGrid.test.tsx front/photofolio/vitest.setup.ts
git commit -m "Add ImageGrid component with lightbox integration"
```

---

## Task 12: `HeroCarousel` component

**Files:**
- Create: `front/photofolio/src/components/HeroCarousel.tsx`
- Test: `front/photofolio/src/components/HeroCarousel.test.tsx`

**Interfaces:**
- Consumes: `PortfolioImage` type from Task 9; the `next/image` mock from Task 11.
- Produces: default export `HeroCarousel` from `front/photofolio/src/components/HeroCarousel.tsx`, props `{ images: PortfolioImage[] }`. Consumed by the landing page (Task 15).

- [ ] **Step 1: Write the failing test**

Create `front/photofolio/src/components/HeroCarousel.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import HeroCarousel from './HeroCarousel';
import type { PortfolioImage } from '@/lib/api';

const images: PortfolioImage[] = [
  { id: '1', title: 'First', description: null, displayOrder: 0, isFeatured: true, width: 1600, height: 900, url: 'https://example.com/1.jpg' },
  { id: '2', title: 'Second', description: null, displayOrder: 1, isFeatured: true, width: 1600, height: 900, url: 'https://example.com/2.jpg' },
];

describe('HeroCarousel', () => {
  it('shows the first image initially', () => {
    render(<HeroCarousel images={images} />);
    expect(screen.getByAltText('First')).toBeInTheDocument();
  });

  it('advances to the next image on Next click', () => {
    render(<HeroCarousel images={images} />);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByAltText('Second')).toBeInTheDocument();
  });

  it('wraps around to the last image when Previous is clicked on the first image', () => {
    render(<HeroCarousel images={images} />);
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(screen.getByAltText('Second')).toBeInTheDocument();
  });

  it('renders nothing when there are no images', () => {
    const { container } = render(<HeroCarousel images={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('hides navigation controls when there is only one image', () => {
    render(<HeroCarousel images={[images[0]]} />);
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `cd front/photofolio && npx vitest run src/components/HeroCarousel.test.tsx`
Expected: FAIL (`Cannot find module './HeroCarousel'`)

- [ ] **Step 3: Write `front/photofolio/src/components/HeroCarousel.tsx`**

```tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { PortfolioImage } from '@/lib/api';

type HeroCarouselProps = {
  images: PortfolioImage[];
};

export default function HeroCarousel({ images }: HeroCarouselProps) {
  const [index, setIndex] = useState(0);

  if (images.length === 0) return null;

  const image = images[index];

  function showPrevious() {
    setIndex((current) => (current === 0 ? images.length - 1 : current - 1));
  }

  function showNext() {
    setIndex((current) => (current === images.length - 1 ? 0 : current + 1));
  }

  return (
    <div className="relative w-full">
      <div className="relative aspect-video w-full overflow-hidden rounded">
        <Image src={image.url} alt={image.title} fill priority className="object-cover" sizes="100vw" />
      </div>
      {images.length > 1 && (
        <div className="mt-2 flex justify-center gap-4">
          <button type="button" onClick={showPrevious} className="rounded bg-black/10 px-3 py-1">
            Previous
          </button>
          <button type="button" onClick={showNext} className="rounded bg-black/10 px-3 py-1">
            Next
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `cd front/photofolio && npx vitest run src/components/HeroCarousel.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add front/photofolio/src/components/HeroCarousel.tsx front/photofolio/src/components/HeroCarousel.test.tsx
git commit -m "Add HeroCarousel component"
```

---

## Task 13: `CategoryTabs` component

**Files:**
- Create: `front/photofolio/src/components/CategoryTabs.tsx`
- Test: `front/photofolio/src/components/CategoryTabs.test.tsx`

**Interfaces:**
- Consumes: `Category` type from Task 9.
- Produces: default export `CategoryTabs` from `front/photofolio/src/components/CategoryTabs.tsx`, props `{ categories: Category[], activeSlug: string }`. Consumed by the `/portfolio` page (Task 16).

- [ ] **Step 1: Write the failing test**

Create `front/photofolio/src/components/CategoryTabs.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import CategoryTabs from './CategoryTabs';
import type { Category } from '@/lib/api';

const categories: Category[] = [
  { id: '1', slug: 'weddings', name: 'Weddings', displayOrder: 0 },
  { id: '2', slug: 'portraits', name: 'Portraits', displayOrder: 1 },
];

describe('CategoryTabs', () => {
  it('renders a link per category pointing at the category query param', () => {
    render(<CategoryTabs categories={categories} activeSlug="weddings" />);
    expect(screen.getByRole('link', { name: 'Weddings' })).toHaveAttribute('href', '/portfolio?category=weddings');
    expect(screen.getByRole('link', { name: 'Portraits' })).toHaveAttribute('href', '/portfolio?category=portraits');
  });

  it('marks the active category link with aria-current', () => {
    render(<CategoryTabs categories={categories} activeSlug="portraits" />);
    expect(screen.getByRole('link', { name: 'Portraits' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Weddings' })).not.toHaveAttribute('aria-current');
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `cd front/photofolio && npx vitest run src/components/CategoryTabs.test.tsx`
Expected: FAIL (`Cannot find module './CategoryTabs'`)

- [ ] **Step 3: Write `front/photofolio/src/components/CategoryTabs.tsx`**

```tsx
import Link from 'next/link';
import type { Category } from '@/lib/api';

type CategoryTabsProps = {
  categories: Category[];
  activeSlug: string;
};

export default function CategoryTabs({ categories, activeSlug }: CategoryTabsProps) {
  return (
    <nav className="flex gap-2 overflow-x-auto" aria-label="Categories">
      {categories.map((category) => (
        <Link
          key={category.id}
          href={`/portfolio?category=${category.slug}`}
          aria-current={category.slug === activeSlug ? 'page' : undefined}
          className={
            category.slug === activeSlug
              ? 'rounded bg-black px-3 py-1 text-white dark:bg-white dark:text-black'
              : 'rounded px-3 py-1 text-black dark:text-white'
          }
        >
          {category.name}
        </Link>
      ))}
    </nav>
  );
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `cd front/photofolio && npx vitest run src/components/CategoryTabs.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add front/photofolio/src/components/CategoryTabs.tsx front/photofolio/src/components/CategoryTabs.test.tsx
git commit -m "Add CategoryTabs component"
```

---

## Task 14: Configure `next/image` for Supabase remote images

**Files:**
- Modify: `front/photofolio/next.config.ts`

This is a config-only change with no unit test; it's verified by linting (catches syntax errors) and by the manual end-to-end check in Task 17.

- [ ] **Step 1: Add `images.remotePatterns`**

Modify `front/photofolio/next.config.ts`, adding an `images` key alongside the existing config:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
```

- [ ] **Step 2: Lint**

Run: `cd front/photofolio && npm run lint`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add front/photofolio/next.config.ts
git commit -m "Allow next/image to optimize Supabase-hosted images"
```

---

## Task 15: Landing page

**Files:**
- Modify: `front/photofolio/src/app/page.tsx`
- Create: `front/photofolio/src/app/page.test.tsx`

**Interfaces:**
- Consumes: `getFeaturedImages` from Task 9, `HeroCarousel` from Task 12.

- [ ] **Step 1: Write the failing test**

Create `front/photofolio/src/app/page.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/api', () => ({
  getFeaturedImages: vi.fn(),
}));

import Home from './page';
import { getFeaturedImages } from '@/lib/api';

describe('Home page', () => {
  it('renders the hero carousel with featured images', async () => {
    (getFeaturedImages as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: '1', title: 'Hero', description: null, displayOrder: 0, isFeatured: true, width: 1600, height: 900, url: 'https://example.com/hero.jpg' },
    ]);

    render(await Home());

    expect(screen.getByAltText('Hero')).toBeInTheDocument();
  });

  it('shows an error message when featured images fail to load', async () => {
    (getFeaturedImages as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('network error'));

    render(await Home());

    expect(screen.getByText(/couldn.t load photos/i)).toBeInTheDocument();
  });

  it('always renders the about section and navigation', async () => {
    (getFeaturedImages as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    render(await Home());

    expect(screen.getByRole('heading', { name: 'About' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Portfolio' })).toHaveAttribute('href', '/portfolio');
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `cd front/photofolio && npx vitest run src/app/page.test.tsx`
Expected: FAIL (current `page.tsx` has no hero carousel, about heading, or nav links)

- [ ] **Step 3: Replace `front/photofolio/src/app/page.tsx`**

```tsx
import Link from 'next/link';
import HeroCarousel from '@/components/HeroCarousel';
import { getFeaturedImages } from '@/lib/api';

export default async function Home() {
  let featuredImages: Awaited<ReturnType<typeof getFeaturedImages>> = [];
  let loadError = false;

  try {
    featuredImages = await getFeaturedImages();
  } catch {
    loadError = true;
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-zinc-50 px-6 py-12 dark:bg-black">
      <header className="flex w-full max-w-5xl items-center justify-between">
        <h1 className="text-xl font-semibold text-black dark:text-white">Your Name Photography</h1>
        <nav className="flex gap-4 text-black dark:text-white">
          <Link href="/portfolio">Portfolio</Link>
          <Link href="/sale">Prints</Link>
        </nav>
      </header>

      <main className="mt-10 flex w-full max-w-5xl flex-col items-center gap-10">
        {loadError && <p className="text-red-600">Couldn&apos;t load photos right now.</p>}
        {!loadError && <HeroCarousel images={featuredImages} />}

        <section className="max-w-2xl text-center text-black dark:text-white">
          <h2 className="text-lg font-semibold">About</h2>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            I&apos;m a photographer capturing light, moments, and the in-between. Explore the
            portfolio to see my work across different categories.
          </p>
        </section>

        <section className="flex gap-4 text-black dark:text-white">
          <a href="mailto:you@example.com">Email</a>
          <a href="https://instagram.com/yourhandle">Instagram</a>
        </section>
      </main>
    </div>
  );
}
```

Note: the name, about text, email, and Instagram handle above are placeholders — edit them directly in this file once the page is live.

- [ ] **Step 4: Run the test and confirm it passes**

Run: `cd front/photofolio && npx vitest run src/app/page.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add front/photofolio/src/app/page.tsx front/photofolio/src/app/page.test.tsx
git commit -m "Build the landing page with hero carousel, about, and contact sections"
```

---

## Task 16: Portfolio page

**Files:**
- Create: `front/photofolio/src/app/portfolio/page.tsx`
- Create: `front/photofolio/src/app/portfolio/page.test.tsx`

**Interfaces:**
- Consumes: `getCategories`, `getCategoryImages` from Task 9; `CategoryTabs` from Task 13; `ImageGrid` from Task 11.

- [ ] **Step 1: Write the failing test**

Create `front/photofolio/src/app/portfolio/page.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/api', () => ({
  getCategories: vi.fn(),
  getCategoryImages: vi.fn(),
}));

import PortfolioPage from './page';
import { getCategories, getCategoryImages } from '@/lib/api';

const categories = [
  { id: '1', slug: 'weddings', name: 'Weddings', displayOrder: 0 },
  { id: '2', slug: 'portraits', name: 'Portraits', displayOrder: 1 },
];

describe('Portfolio page', () => {
  it('defaults to the first category when none is specified', async () => {
    (getCategories as ReturnType<typeof vi.fn>).mockResolvedValue(categories);
    (getCategoryImages as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    render(await PortfolioPage({ searchParams: Promise.resolve({}) }));

    expect(getCategoryImages).toHaveBeenCalledWith('weddings');
    expect(screen.getByRole('link', { name: 'Weddings' })).toHaveAttribute('aria-current', 'page');
  });

  it('fetches the requested category when a category param is given', async () => {
    (getCategories as ReturnType<typeof vi.fn>).mockResolvedValue(categories);
    (getCategoryImages as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    render(await PortfolioPage({ searchParams: Promise.resolve({ category: 'portraits' }) }));

    expect(getCategoryImages).toHaveBeenCalledWith('portraits');
  });

  it('renders the image grid with the fetched images', async () => {
    (getCategories as ReturnType<typeof vi.fn>).mockResolvedValue(categories);
    (getCategoryImages as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'img-1', title: 'Wedding Photo', description: null, displayOrder: 0, isFeatured: false, width: 800, height: 600, url: 'https://example.com/1.jpg' },
    ]);

    render(await PortfolioPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByAltText('Wedding Photo')).toBeInTheDocument();
  });

  it('shows an error message when categories fail to load', async () => {
    (getCategories as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('network error'));

    render(await PortfolioPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText(/couldn.t load photos/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `cd front/photofolio && npx vitest run src/app/portfolio/page.test.tsx`
Expected: FAIL (`Cannot find module './page'`)

- [ ] **Step 3: Write `front/photofolio/src/app/portfolio/page.tsx`**

```tsx
import CategoryTabs from '@/components/CategoryTabs';
import ImageGrid from '@/components/ImageGrid';
import { getCategories, getCategoryImages } from '@/lib/api';

type PortfolioPageProps = {
  searchParams: Promise<{ category?: string }>;
};

export default async function PortfolioPage({ searchParams }: PortfolioPageProps) {
  const { category } = await searchParams;

  let categories: Awaited<ReturnType<typeof getCategories>> = [];
  let images: Awaited<ReturnType<typeof getCategoryImages>> = [];
  let activeSlug = category ?? '';
  let loadError = false;

  try {
    categories = await getCategories();
    activeSlug = category ?? categories[0]?.slug ?? '';
    if (activeSlug) {
      images = await getCategoryImages(activeSlug);
    }
  } catch {
    loadError = true;
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-zinc-50 px-6 py-12 dark:bg-black">
      <div className="w-full max-w-5xl">
        <h1 className="text-2xl font-semibold text-black dark:text-white">Portfolio</h1>

        {loadError && <p className="mt-4 text-red-600">Couldn&apos;t load photos right now.</p>}

        {!loadError && (
          <>
            <div className="mt-6">
              <CategoryTabs categories={categories} activeSlug={activeSlug} />
            </div>
            <div className="mt-6">
              <ImageGrid images={images} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `cd front/photofolio && npx vitest run src/app/portfolio/page.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add front/photofolio/src/app/portfolio/page.tsx front/photofolio/src/app/portfolio/page.test.tsx
git commit -m "Build the /portfolio page with category tabs and image grid"
```

---

## Task 17: Sale page placeholder

**Files:**
- Create: `front/photofolio/src/app/sale/page.tsx`
- Create: `front/photofolio/src/app/sale/page.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `front/photofolio/src/app/sale/page.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import SalePage from './page';

describe('Sale page', () => {
  it('renders a coming-soon message', () => {
    render(<SalePage />);
    expect(screen.getByRole('heading', { name: /coming soon/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `cd front/photofolio && npx vitest run src/app/sale/page.test.tsx`
Expected: FAIL (`Cannot find module './page'`)

- [ ] **Step 3: Write `front/photofolio/src/app/sale/page.tsx`**

```tsx
export default function SalePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6 text-center dark:bg-black">
      <h1 className="text-2xl font-semibold text-black dark:text-white">Prints, coming soon</h1>
      <p className="mt-2 max-w-md text-zinc-600 dark:text-zinc-400">
        This page will let you buy prints of my work. It&apos;s not ready yet &mdash; check back soon.
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `cd front/photofolio && npx vitest run src/app/sale/page.test.tsx`
Expected: PASS

- [ ] **Step 5: Run the full frontend and backend test suites**

Run: `cd front/photofolio && npm test`
Run: `cd back && npm test`
Expected: all tests PASS in both

- [ ] **Step 6: Manual end-to-end check**

With real Supabase credentials in place (Tasks 1 and 3) and at least one seeded category (Task 7):

```bash
cd back && npm start
```

In a second terminal:

```bash
cd front/photofolio && npm run dev
```

Visit `http://localhost:3000` and confirm the hero carousel shows a featured image (if any were seeded with `is_featured`), `http://localhost:3000/portfolio` shows the seeded category's tab and images (click one to confirm the lightbox opens and next/prev work), and `http://localhost:3000/sale` shows the coming-soon message.

- [ ] **Step 7: Commit**

```bash
git add front/photofolio/src/app/sale/page.tsx front/photofolio/src/app/sale/page.test.tsx
git commit -m "Add /sale placeholder page"
```
