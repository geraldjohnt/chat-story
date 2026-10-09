import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

/** The production library as committed; the artifact must serve exactly this. */
const manifest = JSON.parse(readFileSync('stories/manifest.json', 'utf8')) as {
  stories: { id: string; title: string; storyPath: string; parts: { path: string }[] }[];
};

test.describe('production artifact (dist)', () => {
  test('renders the published library', async ({ page }) => {
    await page.goto('./#/library');
    if (manifest.stories.length === 0) {
      await expect(page.getByRole('heading', { name: 'No published stories yet' })).toBeVisible();
      return;
    }
    for (const s of manifest.stories) await expect(page.getByText(s.title, { exact: true }).first()).toBeVisible();
  });

  test('serves the committed production manifest and every referenced file', async ({ request }) => {
    const res = await request.get('stories/manifest.json');
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual(manifest);
    for (const s of manifest.stories) {
      for (const p of [s.storyPath, ...s.parts.map((x) => x.path)]) {
        const r = await request.get(`stories/${p}`);
        expect(r.status(), p).toBe(200);
        expect((await r.text()).startsWith('{'), p).toBe(true);
      }
    }
  });

  test('does not publish fixtures, memory, pending outlines or the gate default', async ({ request }) => {
    for (const p of [
      'stories/9001-fixture-renderer-coverage/story.json',
      'tests/fixtures/stories/manifest.json',
      'memory/project-memory.md',
      'memory/pending-outlines/README.md',
      'CLAUDE.md',
      'access-gate.json',
    ]) {
      const res = await request.get(p);
      const body = res.status() === 200 ? await res.text() : '';
      // vite preview may fall back to index.html for unknown paths; it must never return the real file.
      expect(body.startsWith('{') || body.startsWith('#'), `${p} should not be published`).toBe(false);
    }
  });
});
