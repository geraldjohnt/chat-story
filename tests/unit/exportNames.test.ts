import { describe, expect, it } from 'vitest';
import { screenshotFilename, zipFilename } from '../../src/services/exportNames';
import { readPngSize } from '../../src/services/png';

describe('export filenames', () => {
  it('identifies story, part and screenshot', () => {
    expect(screenshotFilename('0001', 1, 1)).toBe('story-0001-part-01-screenshot-01.png');
    expect(screenshotFilename('0012', 10, 104)).toBe('story-0012-part-10-screenshot-104.png');
    expect(zipFilename('0001', 3)).toBe('story-0001-part-03-screenshots.zip');
  });
  it('sorts lexicographically in screenshot order for up to 99 screenshots', () => {
    const names = Array.from({ length: 30 }, (_, i) => screenshotFilename('0001', 1, i + 1));
    expect([...names].sort()).toEqual(names);
  });
});

describe('readPngSize', () => {
  it('reads IHDR dimensions and rejects non-PNG data', () => {
    const b = new Uint8Array(24);
    b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    new DataView(b.buffer).setUint32(16, 1080);
    new DataView(b.buffer).setUint32(20, 1920);
    expect(readPngSize(b)).toEqual({ width: 1080, height: 1920 });
    expect(() => readPngSize(new Uint8Array(30))).toThrow(/Not a PNG/);
  });
});
