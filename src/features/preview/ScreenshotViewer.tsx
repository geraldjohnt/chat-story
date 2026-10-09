import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type TouchEvent as ReactTouchEvent } from 'react';
import type { RenderedPage } from '../../renderers/registry';
import type { CharacterMap } from '../../renderers/types';
import { ScaledScreenshot } from './ScaledScreenshot';

/** Horizontal travel (px) that turns a drag into a swipe. */
const SWIPE_THRESHOLD = 50;
/** How long the controls stay visible after the last interaction (ms). */
export const CONTROLS_HIDE_DELAY = 2500;

type Props = {
  pages: RenderedPage[];
  index: number;
  characters: CharacterMap;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  onExport: (page: RenderedPage) => void;
  busy: boolean;
  status?: { kind: 'busy' | 'ok' | 'error'; label: string };
};

function useViewportHeight() {
  const [h, setH] = useState(() => window.innerHeight);
  useEffect(() => {
    const update = () => setH(window.innerHeight);
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return h;
}

/**
 * Fullscreen screenshot viewer. Swipe (or ← / →, or the side buttons) to move between screenshots;
 * tap the screen to show or hide the controls, which fade out on their own after a short delay.
 */
export function ScreenshotViewer({ pages, index, characters, onIndexChange, onClose, onExport, busy, status }: Props) {
  const page = pages[index];
  const hasPrev = index > 0;
  const hasNext = index < pages.length - 1;
  const [controls, setControls] = useState(true);
  const [dragX, setDragX] = useState(0);
  const touch = useRef<{ x: number; y: number; horizontal: boolean | null } | null>(null);
  const swiped = useRef(false);
  const viewportHeight = useViewportHeight();

  const go = useCallback(
    (delta: number) => {
      const target = index + delta;
      if (target >= 0 && target < pages.length) onIndexChange(target);
    },
    [index, pages.length, onIndexChange],
  );

  // Auto-hide the controls; keep them up while an export is running.
  useEffect(() => {
    if (!controls || busy) return;
    const t = window.setTimeout(() => setControls(false), CONTROLS_HIDE_DELAY);
    return () => window.clearTimeout(t);
  }, [controls, busy, index, status?.label]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
      else return;
      e.preventDefault();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [go, onClose]);

  // Lock page scroll and use the real Fullscreen API on touch devices where it exists.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const root = document.documentElement;
    const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
    let entered = false;
    if (coarse && typeof root.requestFullscreen === 'function' && !document.fullscreenElement) {
      root.requestFullscreen().then(() => (entered = true), () => undefined);
    }
    return () => {
      document.body.style.overflow = prevOverflow;
      if (entered && document.fullscreenElement && typeof document.exitFullscreen === 'function') void document.exitFullscreen().catch(() => undefined);
    };
  }, []);

  if (!page) return null;

  const onTouchStart = (e: ReactTouchEvent) => {
    const p = e.touches.length === 1 ? e.touches[0] : undefined;
    touch.current = p ? { x: p.clientX, y: p.clientY, horizontal: null } : null;
    swiped.current = false;
  };
  const onTouchMove = (e: ReactTouchEvent) => {
    const t = touch.current;
    const p = e.touches.length === 1 ? e.touches[0] : undefined;
    if (!t || !p) return;
    const dx = p.clientX - t.x;
    const dy = p.clientY - t.y;
    if (t.horizontal === null && Math.abs(dx) + Math.abs(dy) > 8) t.horizontal = Math.abs(dx) > Math.abs(dy);
    // Resist dragging past the first/last screenshot.
    if (t.horizontal) setDragX((dx < 0 ? hasNext : hasPrev) ? dx : dx / 4);
  };
  const onTouchEnd = (e: ReactTouchEvent) => {
    const t = touch.current;
    touch.current = null;
    setDragX(0);
    const end = e.changedTouches[0];
    if (!t || !end) return;
    const dx = end.clientX - t.x;
    const dy = end.clientY - t.y;
    if (Math.abs(dx) >= SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
      swiped.current = true;
      go(dx < 0 ? 1 : -1);
    }
  };
  const onStageClick = () => {
    if (swiped.current) {
      swiped.current = false;
      return;
    }
    setControls((c) => !c);
  };
  // Buttons keep the controls visible instead of toggling them.
  const keep = (fn: () => void) => (e: ReactMouseEvent) => {
    e.stopPropagation();
    setControls(true);
    fn();
  };

  return (
    <div
      className={`viewer${controls ? ' viewer--controls' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={`Screenshot ${page.index} of ${pages.length}`}
      data-controls={controls ? 'visible' : 'hidden'}
      onFocusCapture={() => setControls(true)}
      onPointerMove={(e) => e.pointerType === 'mouse' && setControls(true)}
    >
      <div
        className="viewer__stage"
        data-testid="viewer-stage"
        onClick={onStageClick}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={() => {
          touch.current = null;
          setDragX(0);
        }}
      >
        <div className="viewer__slide" style={{ transform: dragX ? `translateX(${dragX}px)` : undefined, transition: dragX ? 'none' : undefined }}>
          <ScaledScreenshot key={page.key} page={page} characters={characters} maxHeight={Math.max(240, viewportHeight - 24)} />
        </div>
      </div>

      <div className="viewer__bar viewer__control" aria-hidden={!controls}>
        <span className="viewer__count">
          {page.index} / {pages.length}
          <span className="viewer__dims"> · {page.profile.pixelWidth} × {page.profile.pixelHeight}</span>
        </span>
        <span className="viewer__actions">
          <button className="btn btn--small" onClick={keep(() => onExport(page))} disabled={busy} tabIndex={controls ? 0 : -1}>Export PNG</button>
          <button className="btn btn--small" onClick={keep(onClose)} autoFocus tabIndex={controls ? 0 : -1}>Close</button>
        </span>
        {status && <p className={`viewer__status export-status--${status.kind}`} role={status.kind === 'error' ? 'alert' : 'status'}>{status.label}</p>}
      </div>

      <button className="viewer__nav viewer__nav--prev viewer__control" onClick={keep(() => go(-1))} disabled={!hasPrev} aria-label="Previous screenshot" aria-hidden={!controls} tabIndex={controls ? 0 : -1}>‹</button>
      <button className="viewer__nav viewer__nav--next viewer__control" onClick={keep(() => go(1))} disabled={!hasNext} aria-label="Next screenshot" aria-hidden={!controls} tabIndex={controls ? 0 : -1}>›</button>
    </div>
  );
}
