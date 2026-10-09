import { expect, test } from '@playwright/test';
import JSZip from 'jszip';
import { downloadBuffer, openPart, pngSize } from './helpers';

test.describe('PNG and ZIP export (fixture build, GitHub Pages base path)', () => {
  test('exports a single screenshot as a PNG at the iPhone profile size', async ({ page }) => {
    await openPart(page, '9001', 1);
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export screenshot 1 as PNG' }).click()]);
    expect(download.suggestedFilename()).toBe('story-9001-part-01-screenshot-01.png');
    expect(pngSize(await downloadBuffer(download))).toEqual({ width: 1170, height: 2532 });
    await expect(page.getByRole('status').filter({ hasText: 'Downloaded story-9001-part-01-screenshot-01.png' })).toBeVisible();
  });

  test('exports at 1080 × 1920 for the 9:16 profile', async ({ page }) => {
    await openPart(page, '9001', 1);
    await page.getByLabel('Export profile').selectOption('vertical-9-16');
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export screenshot 1 as PNG' }).click()]);
    expect(pngSize(await downloadBuffer(download))).toEqual({ width: 1080, height: 1920 });
  });

  test('exports a whole part as a ZIP with correctly named, ordered, sized PNGs', async ({ page }) => {
    await openPart(page, '9001', 2);
    const expected = await page.locator('.gallery__item').count();
    expect(expected).toBeGreaterThan(4);
    const [download] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.getByRole('button', { name: 'Export part as ZIP' }).click()]);
    expect(download.suggestedFilename()).toBe('story-9001-part-02-screenshots.zip');
    const zip = await JSZip.loadAsync(await downloadBuffer(download));
    const names = Object.keys(zip.files).sort();
    expect(names).toEqual(Array.from({ length: expected }, (_, i) => `story-9001-part-02-screenshot-${String(i + 1).padStart(2, '0')}.png`));
    const profiles = await page.locator('.gallery .cds-screen').evaluateAll((els) => els.map((e) => e.getAttribute('data-profile')));
    for (const [i, name] of names.entries()) {
      const size = pngSize(Buffer.from(await zip.file(name)!.async('uint8array')));
      expect(size).toEqual(profiles[i] === 'iphone' ? { width: 1170, height: 2532 } : { width: 1080, height: 1920 });
    }
    // Every image differs (no duplicated screenshot).
    const hashes = await Promise.all(names.map(async (n) => (await zip.file(n)!.async('base64')).slice(-200)));
    expect(new Set(hashes).size).toBe(names.length);
  });

  test('exported image matches the on-screen preview', async ({ page }) => {
    await openPart(page, '9001', 1);
    const frame = page.locator('.gallery__item').first().locator('.scaled__frame');
    const previewPng = (await frame.screenshot()).toString('base64');
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export screenshot 1 as PNG' }).click()]);
    const exportPng = (await downloadBuffer(download)).toString('base64');
    const diff = await page.evaluate(async ([a, b]) => {
      const load = (src: string) => new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = `data:image/png;base64,${src}`; });
      const [pa, pb] = await Promise.all([load(a!), load(b!)]);
      const w = 60, h = Math.round((60 * pa.height) / pa.width);
      const px = (img: HTMLImageElement) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d')!; x.drawImage(img, 0, 0, w, h); return x.getImageData(0, 0, w, h).data; };
      const da = px(pa), db = px(pb);
      let sum = 0;
      for (let i = 0; i < da.length; i += 4) sum += Math.abs(da[i]! - db[i]!) + Math.abs(da[i + 1]! - db[i + 1]!) + Math.abs(da[i + 2]! - db[i + 2]!);
      return sum / (w * h * 3);
    }, [previewPng, exportPng]);
    expect(diff).toBeLessThan(10);
  });

  test('reports a clear error instead of fake success when fonts cannot load', async ({ page }) => {
    await page.route('**/*.woff2', (r) => r.abort());
    await openPart(page, '9001', 1);
    let downloaded = false;
    page.on('download', () => { downloaded = true; });
    await page.getByRole('button', { name: 'Export screenshot 1 as PNG' }).click();
    await expect(page.getByRole('alert')).toContainText('PNG export failed', { timeout: 20000 });
    expect(downloaded).toBe(false);
  });
});
