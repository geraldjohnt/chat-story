import { expect, test } from '@playwright/test';

test.describe('mobile layout', () => {
  test('uses the bottom tab bar and has no horizontal scrolling', async ({ page }) => {
    for (const path of ['./', './#/library', './#/stories/9001', './#/stories/9001/parts/1', './#/settings']) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(300);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `horizontal overflow on ${path}`).toBeLessThanOrEqual(0);
    }
    await expect(page.getByRole('navigation', { name: 'Primary (mobile)' })).toBeVisible();
    await page.getByRole('navigation', { name: 'Primary (mobile)' }).getByRole('link', { name: 'Library' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Story library');
  });

  test('screenshot previews scale proportionally on a phone', async ({ page }) => {
    await page.goto('./#/stories/9001/parts/1');
    const frame = page.locator('.scaled__frame').first();
    await frame.waitFor();
    const box = (await frame.boundingBox())!;
    expect(box.height / box.width).toBeCloseTo(844 / 390, 1);
  });
});
