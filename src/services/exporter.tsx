import { getFontEmbedCSS, toBlob } from 'html-to-image';
import JSZip from 'jszip';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { ScreenshotRenderer, type RenderedPage } from '../renderers/registry';
import type { CharacterMap } from '../renderers/types';
import { screenshotFilename, zipFilename } from './exportNames';
import { ensureScreenshotFonts } from './fonts';
import { readPngSize } from './png';

export class ExportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExportError';
  }
}

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

let fontCssPromise: Promise<string> | null = null;

/**
 * Renders one page with the same React renderer used for previews, at the profile's logical
 * size, then rasterises it at `profile.scale` so the PNG is exactly pixelWidth × pixelHeight.
 */
export async function renderPagePng(page: RenderedPage, characters: CharacterMap): Promise<Blob> {
  try {
    await ensureScreenshotFonts();
  } catch (e) {
    throw new ExportError(`Fonts are not ready: ${(e as Error).message}. Check your connection and try again.`);
  }
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.className = 'export-host';
  // Kept in the layout (not display:none) so fonts and layout resolve, but off-screen.
  Object.assign(host.style, { position: 'fixed', left: '-100000px', top: '0', pointerEvents: 'none', contain: 'layout paint' });
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    flushSync(() => root.render(<ScreenshotRenderer page={page} characters={characters} />));
    await nextFrame();
    await nextFrame();
    const node = host.firstElementChild as HTMLElement | null;
    if (!node) throw new ExportError('Renderer produced no output');
    const { width, height, scale, pixelWidth, pixelHeight } = page.profile;
    fontCssPromise ??= getFontEmbedCSS(node).catch((e) => {
      fontCssPromise = null;
      throw e;
    });
    const fontEmbedCSS = await fontCssPromise;
    const blob = await toBlob(node, { width, height, pixelRatio: scale, fontEmbedCSS, cacheBust: false });
    if (!blob) throw new ExportError('The browser could not produce a PNG for this screenshot');
    const size = readPngSize(new Uint8Array(await blob.arrayBuffer()));
    if (size.width !== pixelWidth || size.height !== pixelHeight) {
      throw new ExportError(`Exported image is ${size.width}×${size.height}, expected ${pixelWidth}×${pixelHeight}`);
    }
    return blob;
  } catch (e) {
    if (e instanceof ExportError) throw e;
    throw new ExportError(`Screenshot capture failed: ${(e as Error)?.message ?? String(e)}`);
  } finally {
    root.unmount();
    host.remove();
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function exportPagePng(storyId: string, partNumber: number, page: RenderedPage, characters: CharacterMap): Promise<string> {
  const blob = await renderPagePng(page, characters);
  const name = screenshotFilename(storyId, partNumber, page.index);
  downloadBlob(blob, name);
  return name;
}

/** Renders every page in order and downloads them as a ZIP. Fails as a whole if any page fails. */
export async function exportPartZip(
  storyId: string,
  partNumber: number,
  pages: RenderedPage[],
  characters: CharacterMap,
  onProgress?: (done: number, total: number) => void,
): Promise<{ filename: string; count: number }> {
  const zip = new JSZip();
  const names = new Set<string>();
  for (const [i, page] of pages.entries()) {
    onProgress?.(i, pages.length);
    const name = screenshotFilename(storyId, partNumber, page.index);
    if (names.has(name)) throw new ExportError(`Duplicate filename ${name}`);
    names.add(name);
    zip.file(name, await renderPagePng(page, characters));
  }
  onProgress?.(pages.length, pages.length);
  const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
  const filename = zipFilename(storyId, partNumber);
  downloadBlob(blob, filename);
  return { filename, count: names.size };
}
