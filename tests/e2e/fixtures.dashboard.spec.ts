import { expect, test } from '@playwright/test';

test.describe('dashboard (fixture build)', () => {
  test('loads the manifest and story JSON under the /chat-story/ base path', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (r) => requests.push(new URL(r.url()).pathname));
    await page.goto('./');
    await expect(page.getByRole('region', { name: 'Library statistics' })).toContainText('2');
    expect(requests).toContain('/chat-story/stories/manifest.json');
    expect(requests).toContain('/chat-story/stories/9001-fixture-renderer-coverage/story.json');
  });

  test('navigates library → story → part → next part', async ({ page }) => {
    await page.goto('./#/library');
    await page.getByRole('searchbox').fill('coverage');
    await page.getByRole('link', { name: 'Fixture: Renderer Coverage' }).click();
    await page.getByRole('link', { name: 'Read part 1' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Conversation coverage');
    await page.getByRole('link', { name: 'Part 2 →' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Notifications and inbox coverage');
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Notifications and inbox coverage');
  });

  test('previews have no clipped content (overflow diagnostics)', async ({ page }) => {
    for (const part of [1, 2]) {
      await page.goto(`./#/stories/9001/parts/${part}`);
      await page.getByRole('list', { name: 'Screenshots' }).waitFor();
      await expect(page.getByText('Layout warning')).toHaveCount(0);
    }
  });

  test('is keyboard navigable with visible focus', async ({ page }) => {
    await page.goto('./');
    await page.getByRole('region', { name: 'Library statistics' }).waitFor();
    await page.keyboard.press('Tab');
    await expect(page.getByText('Skip to content')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Home' }).first()).toBeFocused();
    const outline = await page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle);
    expect(outline).not.toBe('none');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Story library');
  });

  test('dashboard theme setting does not change screenshot themes', async ({ page }) => {
    await page.goto('./#/settings');
    await page.getByText('Dark', { exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.goto('./#/stories/9001/parts/1');
    await page.getByRole('list', { name: 'Screenshots' }).waitFor();
    await expect(page.locator('.gallery .cds-screen').first()).toHaveAttribute('data-theme', 'light');
  });
});
