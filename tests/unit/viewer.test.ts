import { describe, expect, it } from 'vitest';
import { dotWindow } from '../../src/features/preview/ScreenshotViewer';

describe('viewer position dots', () => {
  it('shows every dot when the part is short', () => {
    expect(dotWindow(0, 1)).toEqual([0, 1]);
    expect(dotWindow(4, 9)).toEqual([0, 9]);
  });

  it('slides a window that keeps the current dot centred and inside the range', () => {
    expect(dotWindow(0, 20)).toEqual([0, 9]);
    expect(dotWindow(10, 20)).toEqual([6, 15]);
    expect(dotWindow(19, 20)).toEqual([11, 20]);
  });
});
