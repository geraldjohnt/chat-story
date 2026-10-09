import { existsSync, readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

/** The production library as committed; the artifact must serve exactly this. */
const manifest = JSON.parse(readFileSync('stories/manifest.json', 'utf8')) as {
  stories: { id: string; title: string; storyPath: string; parts: { path: string }[] }[];
};

/** The committed access gate, if any. The password itself is never in the repository. */
const gate = existsSync('public/access-gate.json') ? (JSON.parse(readFileSync('public/access-gate.json', 'utf8')) as { enabled: boolean; hash: string }) : null;

test.describe('production artifact (dist)', () => {
  test('renders the published library', async ({ page }) => {
    if (gate?.enabled) {
      await page.goto('./#/library');
      await expect(page.getByRole('heading', { name: 'Chat Drama Studio' })).toBeVisible();
      await expect(page.getByLabel('Password')).toBeVisible();
      await expect(page.getByRole('list', { name: 'Stories' })).toHaveCount(0);
      // Unlock through the session marker (a UI convenience, not a credential) to check the library behind it.
      await page.evaluate((v) => sessionStorage.setItem('cds.gate.unlocked', v), gate.hash.slice(0, 16));
      await page.reload();
    } else {
      await page.goto('./#/library');
    }
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

  test('serves the committed access gate (hash and salt only) or none at all', async ({ request }) => {
    const res = await request.get('access-gate.json');
    const body = res.status() === 200 ? await res.text() : '';
    if (!gate) {
      expect(body.startsWith('{'), 'access-gate.json should not be published').toBe(false);
      return;
    }
    const served = JSON.parse(body) as Record<string, unknown>;
    expect(served).toEqual(JSON.parse(readFileSync('public/access-gate.json', 'utf8')));
    expect(Object.keys(served).sort()).toEqual(['algorithm', 'createdAt', 'enabled', 'hash', 'params', 'salt', 'schemaVersion']);
  });

  test('does not publish fixtures, memory or pending outlines', async ({ request }) => {
    for (const p of [
      'stories/9001-fixture-renderer-coverage/story.json',
      'tests/fixtures/stories/manifest.json',
      'memory/project-memory.md',
      'memory/pending-outlines/README.md',
      'CLAUDE.md',
    ]) {
      const res = await request.get(p);
      const body = res.status() === 200 ? await res.text() : '';
      // vite preview may fall back to index.html for unknown paths; it must never return the real file.
      expect(body.startsWith('{') || body.startsWith('#'), `${p} should not be published`).toBe(false);
    }
  });
});
