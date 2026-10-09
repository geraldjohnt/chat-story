# Chat Drama Studio

A local-first workflow for authoring **fictional** relationship-drama stories with Claude Code, plus a
read-only, responsive dashboard that renders each story part as realistic iMessage-style screenshots and
exports them as PNG files or ZIP archives. You can then edit the exported screenshots into videos with
your own tools. The app does not generate video.

- **Authoring:** Claude Code, with outline-first explicit approval (see [CLAUDE.md](CLAUDE.md)).
- **Storage:** version-controlled JSON in this repository. There is no database and no backend.
- **Hosting:** a static site on GitHub Pages, deployed by GitHub Actions.

## Contents
1. [Architecture](#architecture)
2. [Prerequisites and installation](#prerequisites-and-installation)
3. [Scripts](#scripts)
4. [Story data and schemas](#story-data-and-schemas)
5. [Portable memory](#portable-memory)
6. [Authoring workflow](#authoring-workflow)
7. [Screenshot types](#screenshot-types)
8. [Export profiles and PNG/ZIP export](#export-profiles-and-pngzip-export)
9. [Password gate and security limitations](#password-gate-and-security-limitations)
10. [GitHub Actions and GitHub Pages](#github-actions-and-github-pages)
11. [Verifying a deployment](#verifying-a-deployment)
12. [Troubleshooting](#troubleshooting)
13. [Moving to another computer](#moving-to-another-computer)

## Architecture

| Layer | Choice |
| --- | --- |
| UI | React 19, TypeScript, Vite, plain CSS (no UI framework) |
| Routing | `HashRouter` (deep links work on GitHub Pages without a 404 fallback) |
| Validation | zod schemas (`src/schemas`) and cross-file rules (`src/services/validation.ts`), shared by the browser and Node scripts |
| Renderer | HTML/CSS components in a registry (`src/renderers/registry.tsx`), with per-type pagination |
| Capture | `html-to-image` in the browser (works on the static site), plus JSZip for archives |
| Font | Inter (bundled via `@fontsource-variable/inter`, so there are no external requests) |
| Tests | Vitest and Testing Library (unit/integration); Playwright (E2E against real builds) |
| CI/CD | GitHub Actions → `actions/deploy-pages` |

```
CLAUDE.md                 Claude Code instructions (read first)
memory/                   Portable project memory + pending-outlines/
stories/manifest.json     Published library (starts empty)
stories/<id>-<slug>/      story.json + part-<n>.json
src/                      Dashboard, renderers, schemas, services
scripts/                  validate, copy data, verify dist, password, helpers
tests/                    unit/, integration/, e2e/, fixtures/ (dev-only data)
public/access-gate.json   Optional casual password gate (absent = off)
```

The dashboard is **read-only**. It never writes to GitHub, and the client contains no tokens.

## Prerequisites and installation
Node.js ≥ 20.19 (CI uses Node 22 LTS) and npm.
```bash
npm ci
npm run dev            # http://localhost:5173 (real library: empty until stories are published)
npm run dev:fixtures   # same, using the development fixtures in tests/fixtures/stories
```

## Scripts
| Script | What it does |
| --- | --- |
| `npm run dev` / `dev:fixtures` | Vite dev server (fixtures mode is development-only) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit + integration tests |
| `npm run test:e2e` | Builds `dist` and `dist-e2e`, then runs Playwright (Chromium) |
| `npm run build` | `vite build`, then copy manifest-referenced story files into `dist/stories/`, then verify the artifact |
| `npm run build:e2e` | Production build with fixture data into `dist-e2e/` (tests only) |
| `npm run validate:stories` | Validate the production library and the fixtures |
| `npm run verify:dist` | Re-run artifact verification on `dist/` |
| `npm run check:parts` | Fail if existing approved part files were modified or deleted |
| `npm run story:next-id` | Print the next never-used story ID |
| `npm run setup:password` | Create `public/access-gate.json` (prompts without echo) |
| `npm run preview` | Serve the last build |

## Story data and schemas
All files carry `schemaVersion: 1`. Unknown fields are **preserved** during reads and validation.

**`stories/manifest.json`** is the only way stories are discovered and published:
```json
{ "schemaVersion": 1, "environment": "production", "stories": [
  { "id": "0001", "slug": "the-secret-message", "title": "The Secret Message",
    "genres": ["relationship-drama"], "status": "ongoing", "partCount": 2,
    "storyPath": "0001-the-secret-message/story.json",
    "parts": [ { "partNumber": 1, "path": "0001-the-secret-message/part-1.json" },
               { "partNumber": 2, "path": "0001-the-secret-message/part-2.json" } ],
    "synopsis": "…", "createdAt": "2026-…Z", "updatedAt": "2026-…Z" } ] }
```
The validator rejects the following: traversal, absolute or URL paths; duplicate IDs, slugs or part numbers; out-of-order parts; missing files; invalid JSON; count mismatches; a fixture manifest or fixture story in production.

**`story.json`** has these fields: `id` (≥4 digits, never reused), `title`, `slug`, `genre`, `tags?`, `language`, `setting`,
`premise`, `synopsis`, `characters[] {id, name, contactName?, role?, age?, description, avatar?{initials,color}}`,
`relationships[] {from, to, type, description}`, `centralConflict`, `secrets[] {id, holder, description, revealedInPart?}`,
`plotOutline[] {partNumber, title, beats[]}`, `plannedEnding`, `continuity[]`, `timeline[] {id, when, event, partNumber?}`,
`unresolvedThreads[] {id, description, introducedInPart?, resolvedInPart?}`, `plannedPartCount`, `completedPartCount`,
`status` (`planned | ongoing | completed | on-hold`), `partSummaries[] {partNumber, title, summary}`, `createdAt`, `updatedAt`.

Consistency rules:
- `completedPartCount` must equal the number of `final` parts.
- A `completed` story has only final parts, `plannedPartCount` equal to its part count, an ending, and no unresolved threads.
- A `planned` story has no parts.
- The manifest's id, slug, title and status must match `story.json`.

**`part-<n>.json`** has these fields: `storyId`, `partNumber`, `title`, `summary`, `status` (`draft | final`), `cliffhanger` (string|null),
`screenshots[]`, `createdAt`, `updatedAt`. Each screenshot is a discriminated union on `type`:

```jsonc
{ "id": "s01", "type": "conversation", "theme": "dark", "exportProfile": "iphone",
  "deviceOwner": "maya", "participants": ["maya", "leo"], "title": "Leo",
  "presentation": { "statusBar": { "time": "11:48", "battery": 23 }, "backBadgeCount": 2 },
  "messages": [
    { "kind": "timestamp", "id": "t1", "label": "Today 11:42 PM" },
    { "kind": "message", "id": "m1", "sender": "leo", "text": "you up?", "sentAt": "2026-03-02T23:42:00Z" },
    { "kind": "message", "id": "m2", "sender": "maya", "text": "why", "receipt": { "status": "read", "at": "11:43 PM" },
      "reactions": [ { "by": "leo", "type": "question" } ] },
    { "kind": "message", "id": "m3", "sender": "leo", "attachment": { "type": "image", "label": "Photo" } },
    { "kind": "system", "id": "x1", "text": "Leo unsent a message" },
    { "kind": "typing", "id": "ty", "sender": "leo" } ] }
```
The other types are listed below. The full definitions are in `src/schemas/screenshot.ts`.
- `notification` takes `lockScreen {time, date}` and `notifications[] {id, app, sender?, title?, body, time, groupCount?}`.
- `notification-center` takes the same fields and renders as a grouped, stacked list.
- `conversation-list` takes `deviceOwner`, `title?` and `conversations[] {id, participants[], name?, preview, time, unread?, unreadCount?, pinned?, muted?}`.

Validation checks message kinds, ISO timestamps, character references, that `deviceOwner` is a participant, that senders and reactors are participants, that each character reacts at most once per message, that receipts appear only on the owner's messages, and that IDs are unique.

**Schema evolution:** bump the version and add a migration in `src/schemas/migrations.ts`. A migration copies every existing field, writes validated output, and never drops content. Record the change in `memory/project-memory.md`.

## Portable memory
`memory/` is committed so the project can move between machines without losing decisions:
`project-memory.md` (architecture/status), `channel-bible.md` (tone and writing standards),
`story-index.json` (all allocated stories and retired IDs), `character-registry.json`, `continuity.md`,
`lessons-learned.md`, and `pending-outlines/` (proposals awaiting approval). Claude Code must read these files before authoring.

## Authoring workflow
1. Ask Claude Code for outlines, either in plain words or with `/outline five original outlines…`. Claude saves the proposals in `memory/pending-outlines/` and stops there.
2. Review the outlines and request changes. Then approve one **explicitly**, e.g. "I approve outline the-other-account, generate the story". Feedback like "looks good" does not count as approval.
3. Claude allocates an ID (`npm run story:next-id`) and writes `story.json` and all of the parts. It then updates the manifest and memory, and runs validation, tests and the build. If everything passes, it commits and pushes.
4. GitHub Actions deploys the site. Open the site and tap **Refresh**.
5. To continue a story, use `/continue 0001 two more parts`. Approved parts are never rewritten without your authorisation (`npm run check:parts` enforces this).

The other slash commands are `/help`, `/review` and `/validate` (see `.claude/commands/`).

## Screenshot types
| Type | Features |
| --- | --- |
| `conversation` | One-to-one and group chats, header with avatar(s), incoming/outgoing bubbles with tails, run grouping, sender names and avatars in groups, date separators, delivered/read receipts, tapback reactions, typing indicator, image/video/file/link/voice/location/contact attachments, unsent and system lines, composer with optional draft text, unread badge on the back button |
| `notification` | Lock screen with wallpaper, lock icon, date, large clock, notification cards with contact or app icon, stacked groups, flashlight/camera controls |
| `notification-center` | Compact clock, "Notification Center" title, per-app group headers, wrapped long text |
| `conversation-list` | Large "Messages" title, search, pinned grid (up to 9) with unread dots, rows with avatar, name, two-line preview, time, unread dot, muted icon |

Each screenshot chooses `light` or `dark` independently of the dashboard theme. Optional `presentation` overrides cover the status bar, bubble and background colours, the wallpaper gradient, `fontScale` (0.85–1.3), composer visibility and text, receipt hiding, and the back badge.

**Overflow:** each type paginates its own content into more screenshots when needed. Message order is preserved, and nothing is dropped or duplicated:
- Conversations measure text with the bundled font, keep date separators with the next message, and split a single over-long message at a line or sentence boundary.
- Notifications and inbox rows flow onto continuation screenshots.

Text is never shrunk to fit. Plan groups around conversational beats, and let the renderer handle any overflow. The preview shows "Layout warning" if anything would be clipped.

New types: add a schema, a `paginate()` function and a component, then register them in `src/renderers/registry.tsx`.

## Export profiles and PNG/ZIP export
| Profile | Logical size | Scale | PNG |
| --- | --- | --- | --- |
| `iphone` | 390 × 844 pt | 3× | **1170 × 2532** |
| `vertical-9-16` | 360 × 640 pt | 3× | **1080 × 1920** |

Previews and exports use the same React components:
- **Preview:** the screen is laid out at its logical size and scaled with a CSS transform.
- **Export:** the screen is rendered off-screen at the same logical size and rasterised at the profile's scale, directly at the target pixel size (never by upscaling a preview).

Before capture, the exporter waits for fonts and layout. It reads each PNG's real dimensions and refuses to download a file of the wrong size.

On a part page you can temporarily switch the theme or profile; the story JSON is never modified. Then use **PNG** (one screenshot) or **Export part as ZIP**. Files are named `story-0001-part-01-screenshot-01.png`, and archives `story-0001-part-01-screenshots.zip`.

Rendered images are temporary. `.gitignore` excludes `*.png` and `*.zip`, and they are never committed.

**Browser notes:** exports were verified in Chromium (Playwright). iOS Safari may show a downloaded PNG in a viewer; use Share → Save Image or Save to Files. Very large ZIPs can be slow on older phones.

## Password gate and security limitations
GitHub Pages serves static files. **Anyone who knows the URL can download the published JSON, the gate configuration and the verification code. The password gate is a casual deterrent and does not make anything private.** Real confidentiality would need protected hosting or an authenticated backend, which is outside the scope of this version. Do not publish anything that must stay confidential.

- **Setup on a phone:** open the dashboard, go to **Settings → Access gate → Set or change the password** and generate the configuration. It is derived locally in your browser with Argon2id and a random salt. Then, on GitHub, create or edit `public/access-gate.json`, paste the configuration and commit.
- **Setup in a terminal:** `npm run setup:password` (prompts without echo; `--stdin` for automation; `--disable` to turn the gate off).
- The configuration stores only `algorithm`, `params` (19 MiB, t=2, p=1), `salt` and `hash`, never the password. No default password ships, so with no file the gate is off.
- To disable the gate, set `"enabled": false` or delete the file. To change the password, generate a new configuration.
- An unlocked state is remembered for the browser session in `sessionStorage`. This is a convenience, not a credential.
- If the file is malformed, the app stays usable and Settings reports "Invalid configuration".

## GitHub Actions and GitHub Pages
`.github/workflows/deploy-pages.yml` runs on every push to `main`, on pull requests (build and test only) and manually. It runs these steps in order:
1. `npm ci`
2. typecheck
3. lint
4. unit and integration tests
5. `validate:stories`
6. build (copies and verifies story data)
7. fixture build and Playwright E2E
8. `verify:dist`
9. `upload-pages-artifact`
10. `deploy-pages`

Permissions are `contents: read` by default, and `pages: write` plus `id-token: write` only for the deploy job. Concurrency prevents overlapping deployments.

**One-time repository setup (owner):** Settings → Pages → *Build and deployment* → Source: **GitHub Actions**.
Pages for **private** repositories requires a paid GitHub plan (Pro/Team/Enterprise). On a free plan the repository must be public for Pages to work. That decision belongs to the owner.

The base path is derived from `GITHUB_REPOSITORY` (`/<repo>/`). Override it with `BASE_PATH=/` for a custom domain.

## Verifying a deployment
1. GitHub → Actions → the latest "Build, test and deploy to GitHub Pages" run should be green.
2. The deploy job shows the site URL (normally `https://<owner>.github.io/<repo>/`).
3. Open `<url>stories/manifest.json`. It should return the manifest JSON.
4. Open `<url>`. The dashboard should show the library (or the empty state) without errors.

## Troubleshooting
| Symptom | Fix |
| --- | --- |
| "manifest.json was not found" right after a push | Pages may still be deploying; wait a minute and tap Refresh |
| Old data shown | Tap **Refresh** (it bypasses caches); Pages caches for up to ~10 min |
| Deploy job fails with "Pages not enabled"/404 | Set Pages Source to GitHub Actions; check plan/visibility (above) |
| Validation fails in CI | Run `npm run validate:stories` locally and fix the reported file/field |
| "Layout warning" on a preview | Report it; the renderer estimated the size wrongly. Splitting the message usually helps |
| Export error about fonts | The network blocked the font; reload and retry |

## Moving to another computer
Everything that matters is in Git: code, `stories/`, `memory/`, `CLAUDE.md`, and the workflow.
Clone the repository, run `npm ci`, and start Claude Code in the folder. It reads `CLAUDE.md` and `memory/` and continues from there. No local secrets are required.
