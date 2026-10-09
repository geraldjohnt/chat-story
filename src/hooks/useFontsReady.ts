import { useEffect, useState } from 'react';
import { ensureScreenshotFonts } from '../services/fonts';

/** Pagination measures text with the screenshot font, so wait for it before laying out pages. */
export function useFontsReady(): { ready: boolean; error: string | null } {
  const [state, setState] = useState<{ ready: boolean; error: string | null }>({ ready: false, error: null });
  useEffect(() => {
    let alive = true;
    ensureScreenshotFonts().then(
      () => alive && setState({ ready: true, error: null }),
      (e: Error) => alive && setState({ ready: true, error: e.message }),
    );
    return () => {
      alive = false;
    };
  }, []);
  return state;
}
