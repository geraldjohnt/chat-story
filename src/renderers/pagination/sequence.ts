/**
 * Generic greedy paginator that preserves order and never drops or duplicates items.
 * - `heightOf(item, prev, isFirstOnPage)` returns the vertical space the item needs.
 * - `keepWithNext(item)` items (e.g. date separators) never end a page when they can move.
 * - `split(item, available)` may split an item that cannot fit even on an empty page.
 */
export interface SequenceOptions<T> {
  capacity: number;
  heightOf: (item: T, prev: T | undefined, isFirstOnPage: boolean) => number;
  keepWithNext?: (item: T) => boolean;
  split?: (item: T, available: number) => [T, T] | null;
}

export interface SequencePage<T> {
  items: T[];
  height: number;
  /** True when a single unsplittable item is taller than the page. */
  overflow: boolean;
}

export function paginateSequence<T>(input: readonly T[], opts: SequenceOptions<T>): SequencePage<T>[] {
  const pages: SequencePage<T>[] = [];
  let page: T[] = [];
  let used = 0;
  let overflow = false;
  const queue = [...input];

  const pageHeight = (items: T[]) =>
    items.reduce((h, it, i) => h + opts.heightOf(it, items[i - 1], i === 0), 0);

  const closePage = () => {
    // Move trailing keep-with-next items (e.g. a date separator) to the next page.
    const carry: T[] = [];
    while (page.length > 1 && opts.keepWithNext?.(page[page.length - 1] as T)) carry.unshift(page.pop() as T);
    pages.push({ items: page, height: pageHeight(page), overflow });
    page = [];
    used = 0;
    overflow = false;
    queue.unshift(...carry);
  };

  let guard = 0;
  while (queue.length) {
    if (++guard > 100000) throw new Error('paginateSequence did not converge');
    const item = queue.shift() as T;
    const isFirst = page.length === 0;
    const h = opts.heightOf(item, page[page.length - 1], isFirst);
    if (used + h <= opts.capacity) {
      page.push(item);
      used += h;
      continue;
    }
    if (!isFirst) {
      queue.unshift(item);
      closePage();
      continue;
    }
    // Item alone exceeds a whole page.
    const parts = opts.split?.(item, opts.capacity);
    if (parts) {
      page.push(parts[0]);
      used += opts.heightOf(parts[0], undefined, true);
      queue.unshift(parts[1]);
      closePage();
      continue;
    }
    page.push(item);
    used += h;
    overflow = true;
    closePage();
  }
  if (page.length) closePage();
  return pages;
}
