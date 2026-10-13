# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

This is a two-part project with no shared tooling or build step between the parts — treat them as independent apps that happen to live side by side:

- `back/` — Express backend. Currently just a `package.json` with `express` as its only dependency; **there is no source file, entry point, or npm script yet**. Before running or extending it, check whether a server file (e.g. `index.js`) has been added since this doc was written.
- `front/photofolio/` — Next.js frontend. This is the only part with real code so far, and it is its own git repository (has its own `.git`), separate from the repo root.

There is no root-level `package.json`, workspace config, or shared CI — each half is built/run from its own directory.

## Commands

All frontend commands run from `front/photofolio/`:

```bash
cd front/photofolio
npm install
npm run dev     # next dev — Turbopack dev server on http://localhost:3000
npm run build   # next build
npm run start   # next start (serve production build)
npm run lint    # eslint (flat config in eslint.config.mjs)
```

There is no test script configured in the frontend yet.

Backend, from `back/`:

```bash
cd back
npm install   # only installs express; no app code to run yet
```

## Frontend architecture (`front/photofolio`)

- Next.js **16.4.0** on the App Router, React **19.3**, TypeScript, Tailwind CSS **v4**. Source lives under `src/app/` (`layout.tsx`, `page.tsx`, `globals.css`); `@/*` resolves to `./src/*` (see `tsconfig.json`).
- Tailwind v4 is wired in via the Turbopack loader directly in `next.config.ts` (`turbopack.rules["*.css"]`), not a separate PostCSS config — if Tailwind stops applying, check that block first.
- `next.config.ts` opts into several non-default features that affect how code should be written:
  - `reactCompiler: true` (with `babel-plugin-react-compiler` in devDependencies) — manual memoization (`useMemo`/`useCallback`/`React.memo`) is largely unnecessary; let the compiler handle it.
  - `cacheComponents: true` and `partialPrefetching: true` — these are cache/prefetch behaviors specific to recent Next.js versions and may differ from older Next.js knowledge; verify against the installed version's docs rather than assuming older App Router semantics.
  - `experimental.agentFeedback: true`.
- `AGENTS.md` in `front/photofolio/` is **auto-generated and re-written by `next dev`** (see `node_modules/next/dist/server/lib/generate-agent-files.js`). Its instruction: because this Next.js version may have breaking changes vs. training data, consult `node_modules/next/dist/docs/` before relying on prior Next.js knowledge for this project. Don't hand-edit that file's content expecting it to stick — removing it from a diff just re-creates the change on next `next dev` run; if it's checked in, commit it as-is.
- ESLint uses the flat-config format (`eslint.config.mjs`) extending `eslint-config-next`'s `core-web-vitals` and `typescript` rule sets.
