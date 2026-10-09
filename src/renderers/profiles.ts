import type { ExportProfileId } from '../types';

/**
 * Export profiles. Screens are laid out in logical points (CSS px) at `width × height`
 * and rasterised at `scale`, so the PNG is exactly `pixelWidth × pixelHeight`.
 * Preview uses the same layout scaled down with a CSS transform.
 */
export interface ExportProfile {
  id: ExportProfileId;
  label: string;
  description: string;
  width: number;
  height: number;
  scale: number;
  pixelWidth: number;
  pixelHeight: number;
  statusBarHeight: number;
  homeIndicatorHeight: number;
  /** Rounded "dynamic island" style status bar layout. */
  island: boolean;
}

export const EXPORT_PROFILES: Record<ExportProfileId, ExportProfile> = {
  iphone: {
    id: 'iphone',
    label: 'iPhone (1170 × 2532)',
    description: 'iPhone-like portrait screen, 390 × 844 pt rendered at 3×.',
    width: 390,
    height: 844,
    scale: 3,
    pixelWidth: 1170,
    pixelHeight: 2532,
    statusBarHeight: 54,
    homeIndicatorHeight: 34,
    island: true,
  },
  'vertical-9-16': {
    id: 'vertical-9-16',
    label: '9:16 vertical (1080 × 1920)',
    description: '9:16 canvas for short-form video, 360 × 640 pt rendered at 3×.',
    width: 360,
    height: 640,
    scale: 3,
    pixelWidth: 1080,
    pixelHeight: 1920,
    statusBarHeight: 44,
    homeIndicatorHeight: 20,
    island: false,
  },
};

export function getProfile(id: ExportProfileId): ExportProfile {
  return EXPORT_PROFILES[id];
}
