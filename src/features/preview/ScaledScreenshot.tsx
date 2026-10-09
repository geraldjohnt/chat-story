import { useLayoutEffect, useRef, useState } from 'react';
import { ScreenshotRenderer, type RenderedPage } from '../../renderers/registry';
import type { CharacterMap } from '../../renderers/types';

/**
 * Preview: renders the exact export DOM at logical size and scales it to fit the container
 * with a CSS transform (aspect ratio preserved). Flags content overflow as a diagnostic.
 */
export function ScaledScreenshot({ page, characters, maxHeight }: { page: RenderedPage; characters: CharacterMap; maxHeight?: number }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  const [overflow, setOverflow] = useState(false);
  const { width, height } = page.profile;

  useLayoutEffect(() => {
    const el = outer.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth || width * 0.5;
      let s = w / width;
      if (maxHeight && height * s > maxHeight) s = maxHeight / height;
      setScale(s);
    };
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width, height, maxHeight]);

  useLayoutEffect(() => {
    const areas = inner.current?.querySelectorAll<HTMLElement>('.cds-convo__area, .cds-lock__list, .cds-nc__list, .cds-rows');
    setOverflow(Array.from(areas ?? []).some((a) => a.scrollHeight > a.clientHeight + 1));
  }, [page]);

  return (
    <div ref={outer} className="scaled" style={{ maxWidth: maxHeight ? (maxHeight * width) / height : undefined }}>
      <div className="scaled__frame" style={{ width: width * scale, height: height * scale }}>
        <div ref={inner} className="scaled__inner" style={{ transform: `scale(${scale})`, width, height }}>
          <ScreenshotRenderer page={page} characters={characters} />
        </div>
      </div>
      {(overflow || page.overflow) && <p className="warn-text small" role="note">Layout warning: content may be clipped in this screenshot.</p>}
    </div>
  );
}
