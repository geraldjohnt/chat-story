/**
 * Text measurement used for pagination. In the browser it uses canvas measureText with the
 * bundled Inter font (call after fonts are ready). In non-browser environments (tests, Node)
 * it falls back to a conservative per-character estimate so pagination never under-counts.
 */
export const FONT_FAMILY = '"Inter Variable", Inter, -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif';

export interface TextMeasurer {
  width(text: string, fontSize: number, weight?: number): number;
  kind: 'canvas' | 'estimate';
}

let canvasCtx: CanvasRenderingContext2D | null | undefined;
const cache = new Map<string, number>();

function getCtx(): CanvasRenderingContext2D | null {
  if (canvasCtx !== undefined) return canvasCtx;
  canvasCtx = null;
  try {
    if (typeof document !== 'undefined' && !/jsdom/i.test(navigator.userAgent)) {
      canvasCtx = document.createElement('canvas').getContext('2d');
    }
  } catch {
    canvasCtx = null;
  }
  return canvasCtx;
}

/** Wide characters (emoji, CJK) are estimated as 1.25em, others by class. */
function estimateChar(ch: string, size: number): number {
  const cp = ch.codePointAt(0) ?? 0;
  if (cp > 0x2e80) return size * 1.25;
  if (/[il.,:;'!|]/.test(ch)) return size * 0.3;
  if (/[mwMW@]/.test(ch)) return size * 0.88;
  if (/[A-Z0-9]/.test(ch)) return size * 0.68;
  if (ch === ' ') return size * 0.28;
  return size * 0.56;
}

export const estimateMeasurer: TextMeasurer = {
  kind: 'estimate',
  width(text, size) {
    let w = 0;
    for (const ch of text) w += estimateChar(ch, size);
    return w;
  },
};

export function getMeasurer(): TextMeasurer {
  const ctx = getCtx();
  if (!ctx) return estimateMeasurer;
  return {
    kind: 'canvas',
    width(text, size, weight = 400) {
      const key = `${weight}|${size}|${text}`;
      const hit = cache.get(key);
      if (hit !== undefined) return hit;
      ctx.font = `${weight} ${size}px ${FONT_FAMILY}`;
      const w = ctx.measureText(text).width;
      if (cache.size > 20000) cache.clear();
      cache.set(key, w);
      return w;
    },
  };
}

/** Clears cached widths (call when fonts finish loading). */
export function resetMeasureCache(): void {
  cache.clear();
}

/**
 * Greedy word wrap equivalent to CSS `overflow-wrap: anywhere; white-space: pre-wrap`.
 * Returns the wrapped lines (explicit newlines are honoured).
 */
export function wrapText(text: string, maxWidth: number, size: number, m: TextMeasurer, weight = 400): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    const words = paragraph.split(/(\s+)/).filter((w) => w.length > 0);
    let line = '';
    for (const word of words) {
      const candidate = line + word;
      if (m.width(candidate.trimEnd(), size, weight) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line.trim()) lines.push(line.trimEnd());
      line = /^\s+$/.test(word) ? '' : word;
      // Break words that are longer than a whole line.
      while (m.width(line, size, weight) > maxWidth && line.length > 1) {
        let cut = line.length - 1;
        while (cut > 1 && m.width(line.slice(0, cut), size, weight) > maxWidth) cut--;
        lines.push(line.slice(0, cut));
        line = line.slice(cut);
      }
    }
    lines.push(line.trimEnd());
  }
  return lines;
}

export function countLines(text: string, maxWidth: number, size: number, m: TextMeasurer, weight = 400): number {
  return Math.max(1, wrapText(text, maxWidth, size, m, weight).length);
}
