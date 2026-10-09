import type { Download, Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

export function pngSize(buf: Buffer): { width: number; height: number } {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

export async function downloadBuffer(d: Download): Promise<Buffer> {
  const p = await d.path();
  return readFileSync(p);
}

export async function openPart(page: Page, story: string, part: number) {
  await page.goto(`./#/stories/${story}/parts/${part}`);
  await page.getByRole('list', { name: 'Screenshots' }).waitFor();
}
