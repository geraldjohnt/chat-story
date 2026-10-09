# Chat Drama Studio — instructions for Claude Code

Chat Drama Studio is a **local-first, approval-based authoring workflow** for fictional relationship-drama
stories, plus a **read-only** React dashboard (GitHub Pages) that renders story parts as iMessage-style
screenshots and exports them as PNG/ZIP. Claude Code is the author and repository maintainer. The
dashboard never writes to the repository. There is no backend, database or paid API.

## Read before authoring or continuing any story (mandatory)

1. This file.
2. `memory/project-memory.md` — architecture, conventions, current status.
3. `memory/channel-bible.md` — tone, writing standards, originality rules.
4. `memory/story-index.json` — every story ever allocated (premises, conflicts, endings, retired IDs).
5. `memory/character-registry.json` — characters across stories.
6. `memory/continuity.md` — open threads and facts that must be respected.
7. `memory/lessons-learned.md` — reusable quality lessons.
8. `stories/manifest.json` — what is published.
9. For continuations: the story's `story.json` and its latest part files.
10. `memory/pending-outlines/` — proposals awaiting approval (avoid duplicating them).

Memory is the source of continuity. Keep it concise and current; never paste whole story files into it.

## Where things live

| Path | Purpose |
| --- | --- |
| `stories/manifest.json` | **Source of truth** for published stories. Only listed files are deployed. Starts empty (`"environment": "production"`). |
| `stories/<id>-<slug>/story.json` | Story metadata (schema v1, `src/schemas/story.ts`). |
| `stories/<id>-<slug>/part-<n>.json` | One file per part with ordered screenshots (schema v1, `src/schemas/part.ts`, `src/schemas/screenshot.ts`). |
| `memory/` | Portable project memory (committed). `pending-outlines/` holds proposals. |
| `tests/fixtures/stories/` | Development fixtures (`"environment": "fixture"`, `"fixture": true`). **Never** copy into `stories/`. |
| `src/renderers/` | Screenshot renderer registry, pagination, export profiles. |
| `scripts/` | Validation, data copy, artifact verification, password setup, helpers. |
| `public/access-gate.json` | Optional casual password gate (hash + salt only). Absent = gate off. |

## Story workflow

### 1. Outline (no story files yet)
- Read the memory files above; check `story-index.json` and pending outlines for similar premises,
  character setups, secrets, twists and endings.
- Write the proposal to `memory/pending-outlines/<YYYYMMDD>-<slug>.md` using
  `memory/pending-outlines/TEMPLATE.md` (title, premise, synopsis, genre, setting, characters,
  relationships, central conflict, secrets/twists, planned ending, part count with reasoning,
  part-by-part outline, continuity notes, originality assessment). Set `Status: pending`.
- Present it to the user and **stop**. Batches: save each proposal separately; approval is per outline.

### 2. Approval gate (hard rule)
Generate a story **only** after an explicit approval such as "Approve this outline and generate the
story", "I approve outline <x>", "Generate the story from the approved proposal". "Interesting",
"looks good so far", or revision requests are **not** approval — revise the proposal and wait.

### 3. After approval
1. `npm run story:next-id` → allocate the ID (IDs are never reused; never rename directories later).
2. Create `stories/<id>-<slug>/story.json` and every planned `part-<n>.json` with complete screenshot data.
   Use stable character IDs everywhere; plan screenshot groups around conversational beats (the
   renderer paginates overflow automatically — never cram or drop messages).
3. Fill `partSummaries`, `timeline`, `continuity`, `unresolvedThreads`, `secrets.revealedInPart`.
   Counts: `completedPartCount` = number of parts with `"status": "final"`.
4. Add the manifest entry (id, slug, title, genres incl. `genre`, status, partCount, storyPath, ordered
   parts, synopsis, createdAt, updatedAt — `updatedAt` must equal story.json's). Never leave a story
   half-published: the manifest entry and all files go in the same commit.
5. Update `memory/story-index.json`, `character-registry.json`, `continuity.md`; mark the outline
   `Status: approved → story <id>` (keep the file as a record).
6. `npm run validate:stories && npm test && npm run build` — fix every error before committing.
7. Review (see below), then commit and push (see Git rules). Report the deployment result honestly.

### 4. Continuing a story
Read story.json, the latest parts, continuity and open threads. Create only the requested number of new
parts (or decide the number if asked). Update summaries, counts, status, timeline, threads, manifest and
memory. **Never rewrite or delete approved parts without explicit authorisation**; `npm run check:parts`
fails if an existing part file was modified or deleted (`--allow` only after the user authorised it).

### 5. Review (`/review`)
Check schema/manifest validity, numbering, character and relationship consistency, timeline continuity,
unresolved threads, originality vs. the index, dialogue naturalness, pacing, cliffhangers, rendering
(open the part in `npm run dev` or the deployed site; no "Layout warning"), and status/ending consistency.
Report problems; change only what the workflow authorises.

## Quality standards (summary — full version in memory/channel-bible.md)
English; fictional and original; distinct voices; believable timing; evidence-backed reveals; escalating
stakes; earned cliffhangers; coherent endings. Never present stories as real leaked conversations.
No repeated plots with swapped names, contrived twists, or irrational behaviour to force a cliffhanger.

## Commands
```
npm run dev               # dashboard against ./stories (empty until stories are published)
npm run dev:fixtures      # dashboard against tests/fixtures/stories (development only)
npm run typecheck | lint | test
npm run test:e2e          # builds dist + dist-e2e, runs Playwright
npm run validate:stories  # production library + fixtures
npm run build             # vite build + copy referenced story data + verify artifact
npm run story:next-id     # next unused story ID
npm run check:parts       # guard approved parts against modification
npm run setup:password    # create public/access-gate.json (casual gate)
```

## Deployment
`.github/workflows/deploy-pages.yml` runs on pushes to `main`: typecheck → lint → tests → story
validation → build → E2E → artifact verification → deploy via `actions/deploy-pages`. Pages must be set
to **Source: GitHub Actions** (Settings → Pages). The site URL is reported by the deploy job.

## Never without explicit user approval
- Generating story files from an unapproved outline, or auto-approving outlines.
- Rewriting/deleting approved parts; reusing or renumbering story IDs; renaming story directories.
- Force-pushing, resetting, discarding others' work, changing repository visibility or settings.
- Committing secrets, plaintext passwords, generated PNG/ZIP files, or fixtures into `stories/`.
- Adding backends, databases, paid AI APIs, video/audio generation, or a dashboard editor.
- Claiming tests, builds or deployments succeeded without having observed it.
