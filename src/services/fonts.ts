import { resetMeasureCache } from '../renderers/measure';

const FACES = ['400 17px "Inter Variable"', '500 17px "Inter Variable"', '600 17px "Inter Variable"', '700 17px "Inter Variable"'];
let ready: Promise<void> | null = null;

/** Resolves once the bundled screenshot font is loaded (or rejects after a timeout). */
export function ensureScreenshotFonts(timeoutMs = 10000): Promise<void> {
  if (typeof document === 'undefined' || !('fonts' in document)) return Promise.resolve();
  if (!ready) {
    const load = Promise.all(FACES.map((f) => document.fonts.load(f))).then(() => document.fonts.ready).then(() => {
      if (!document.fonts.check(FACES[0]!)) throw new Error('Screenshot font failed to load');
      resetMeasureCache();
    });
    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timed out waiting for screenshot fonts')), timeoutMs));
    ready = Promise.race([load, timeout]).catch((e) => {
      ready = null;
      throw e;
    });
  }
  return ready;
}
