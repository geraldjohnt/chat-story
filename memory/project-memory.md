# Project memory

## Architecture decisions
- Static React 19 + TypeScript + Vite SPA, deployed to GitHub Pages with GitHub Actions. Hash routing
  (`#/stories/0001/parts/1`) so deep links work without a server fallback.
- Story data = versioned JSON in Git. `stories/manifest.json` is the only discovery mechanism. The build
  copies **only manifest-referenced files** into `dist/stories/` (`scripts/copy-story-data.ts`) and
  `scripts/verify-dist.ts` rejects fixtures, memory, pending outlines, PNG/ZIP files and secret patterns.
- Validation: zod schemas in `src/schemas/` (unknown fields preserved via looseObject) + cross-file rules
  in `src/services/validation.ts`, shared by the browser and Node scripts.
- Renderer: registry in `src/renderers/registry.tsx`; each type = schema + paginate() + component.
  Pagination measures text with canvas + the bundled Inter font (estimates in tests). Export uses the same
  React components rendered off-screen, rasterised by html-to-image at `profile.scale`; PNG dimensions are
  verified from the IHDR header before download.
- Profiles: `iphone` 390×844 pt @3× = 1170×2532; `vertical-9-16` 360×640 pt @3× = 1080×1920.
- Access gate: Argon2id (hash-wasm, 19 MiB, t=2, p=1) config in `public/access-gate.json`; deterrent only.

## Conventions
- Story IDs: ≥4-digit zero-padded strings, never reused (`npm run story:next-id`). Directory
  `<id>-<initial-slug>` is never renamed. Fixture IDs use 9xxx and live only in tests/fixtures.
- Character IDs: lowercase slugs, stable across parts. `deviceOwner` decides outgoing vs incoming.
- Part status `final` counts toward `completedPartCount`; `draft` does not.
- Screenshot ids within a part: `s01`, `s02`, … Item ids unique within a screenshot.
- Export names: `story-<id>-part-<NN>-screenshot-<NN>.png`, ZIP `story-<id>-part-<NN>-screenshots.zip`.
  Screenshot numbers count rendered pages (overflow pages included) across the part.

## Status (2026-10-09)
- Application implemented and tested (unit, integration, Playwright E2E). Production library empty.
- Deployed by GitHub Actions to https://geraldjohnt.github.io/chat-story/ (deploy job reported success).
- Published (2026-10-09): 0001 The Rent Went Up (3 parts), 0002 Pickup at 3:15 (4), 0003 Deposit Returned (3); all completed. Next ID: 0004.

## Repository / Pages setup facts
- Repository is public; Pages source = GitHub Actions.
- The repository default branch is `ccr-92f428a9-pxzr8u` (GitHub picked the first pushed branch).
  Switching it to `main` failed once from the phone UI. Deployments come from `main`, which is allowed
  through a "main" deployment-branch rule on the `github-pages` environment. Keep both rules in mind if
  deployments are rejected with no log (environment protection).

## Known limitations / remaining work
- iOS Safari may open downloads in a viewer instead of saving; ZIP export of many screenshots is
  memory-heavy on old phones.
- No schema migrations exist yet (all files v1). See `src/schemas/migrations.ts` for the procedure.
