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

  test('opens screenshots fullscreen and swipes between them', async ({ page }) => {
    await page.goto('./#/stories/9001/parts/1');
    await page.getByRole('button', { name: 'Open screenshot 1 preview' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toHaveAccessibleName(/^Screenshot 1 of \d+$/);
    const vp = page.viewportSize()!;
    const box = (await dialog.boundingBox())!;
    expect(box.width).toBe(vp.width);
    expect(box.height).toBe(vp.height);

    const swipe = (from: number, to: number) =>
      page.getByTestId('viewer-stage').evaluate((el, { a, b }) => {
        const t = (x: number) => new Touch({ identifier: 1, target: el, clientX: x, clientY: 400 });
        el.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: [t(a)], changedTouches: [t(a)] }));
        el.dispatchEvent(new TouchEvent('touchmove', { bubbles: true, touches: [t((a + b) / 2)], changedTouches: [t((a + b) / 2)] }));
        el.dispatchEvent(new TouchEvent('touchend', { bubbles: true, touches: [], changedTouches: [t(b)] }));
      }, { a: from, b: to });
    await swipe(320, 60);
    await expect(dialog).toHaveAccessibleName(/^Screenshot 2 of \d+$/);
    await swipe(60, 320);
    await expect(dialog).toHaveAccessibleName(/^Screenshot 1 of \d+$/);

    await expect(dialog).toHaveAttribute('data-controls', 'hidden', { timeout: 5000 });
    await page.getByTestId('viewer-stage').tap();
    await expect(dialog).toHaveAttribute('data-controls', 'visible');
    await page.getByRole('button', { name: 'Next screenshot' }).tap();
    await expect(dialog).toHaveAccessibleName(/^Screenshot 2 of \d+$/);
    await page.getByRole('button', { name: 'Close' }).tap();
    await expect(dialog).toHaveCount(0);
  });

  test('shows the page counter and dots, and moves between parts at the boundaries', async ({ page }) => {
    await page.goto('./#/stories/9001/parts/1');
    await page.getByRole('button', { name: 'Open screenshot 1 preview' }).waitFor();
    const total = await page.getByRole('list', { name: 'Screenshots' }).getByRole('listitem').count();
    await page.getByRole('button', { name: `Open screenshot ${total} preview` }).click();
    const dialog = page.getByRole('dialog');
    await expect(page.getByTestId('viewer-counter')).toHaveText(`${total} / ${total}`);
    await expect(page.getByTestId('viewer-dots').locator('.viewer__dot.is-active')).toHaveCount(1);
    await page.getByRole('button', { name: 'Next: Part 2 →' }).tap();
    await expect(dialog).toHaveAccessibleName(/^Screenshot 1 of \d+$/);
    await expect(page).toHaveURL(/#\/stories\/9001\/parts\/2$/);
    await page.getByRole('button', { name: '← Part 1' }).tap();
    await expect(dialog).toHaveAccessibleName(`Screenshot ${total} of ${total}`);
  });
});
