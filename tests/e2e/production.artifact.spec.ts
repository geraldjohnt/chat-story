import { expect, test } from '@playwright/test';

test.describe('production artifact (dist)', () => {
  test('renders the empty library state', async ({ page }) => {
    await page.goto('./');
    await expect(page.getByRole('heading', { name: 'No published stories yet' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Library statistics' })).toContainText('0');
    await page.goto('./#/library');
    await expect(page.getByRole('heading', { name: 'No published stories yet' })).toBeVisible();
  });

  test('serves a valid empty production manifest at the base path', async ({ request }) => {
    const res = await request.get('stories/manifest.json');
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ schemaVersion: 1, environment: 'production', stories: [] });
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
