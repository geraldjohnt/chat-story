import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { estimateMeasurer } from '../../src/renderers/measure';
import { RENDERERS, ScreenshotRenderer, buildPages, characterMap, getRenderer } from '../../src/renderers/registry';
import { SCREENSHOT_TYPES } from '../../src/schemas';
import { part1, part2, story1 } from '../helpers/fixtures';

const chars = characterMap(story1().characters);
const pagesOf = (part: ReturnType<typeof part1>, id: string, overrides = {}) => buildPages(part, estimateMeasurer, overrides).filter((p) => p.screenshotId === id);

describe('renderer registry', () => {
  it('registers every screenshot type', () => {
    for (const t of SCREENSHOT_TYPES) expect(getRenderer(t).type).toBe(t);
    expect(Object.keys(RENDERERS).sort()).toEqual([...SCREENSHOT_TYPES].sort());
  });
});

describe('conversation renderer', () => {
  it('aligns messages by sender relative to the device owner', () => {
    const { container } = render(<ScreenshotRenderer page={pagesOf(part1(), 's01')[0]!} characters={chars} />);
    const rows = container.querySelectorAll('[data-item-id]');
    const dir = (id: string) => container.querySelector(`[data-item-id="${id}"]`)?.getAttribute('data-direction');
    expect(rows.length).toBe(6);
    expect(dir('m1')).toBe('incoming');
    expect(dir('m3')).toBe('outgoing');
    expect(screen.getByText('Jordan')).toBeInTheDocument(); // contactName in header
    expect(screen.getByText('Delivered')).toBeInTheDocument();
    expect(container.querySelector('.cds-convo__badge')?.textContent).toBe('3');
  });

  it('renders messages in order with timestamps, reactions and composer', () => {
    const { container } = render(<ScreenshotRenderer page={pagesOf(part1(), 's01')[0]!} characters={chars} />);
    const ids = Array.from(container.querySelectorAll('[data-item-id]')).map((e) => e.getAttribute('data-item-id'));
    expect(ids).toEqual(['t1', 'm1', 'm2', 'm3', 'm4', 'm5']);
    expect(container.querySelector('.cds-ts')?.textContent).toBe('Today 9:38 PM');
    expect(container.querySelectorAll('[data-reaction]')).toHaveLength(3);
    expect(container.querySelector('.cds-tapback.is-mine')).not.toBeNull();
    expect(screen.getByText('iMessage')).toBeInTheDocument();
  });

  it('renders group chats with sender labels, avatars, attachments, system and typing items', () => {
    const page = pagesOf(part1(), 's03');
    const { container } = render(<>{page.map((p) => <ScreenshotRenderer key={p.key} page={p} characters={chars} />)}</>);
    expect(screen.getAllByText('Saturday Crew').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('.cds-sender').length).toBeGreaterThan(1);
    expect(container.querySelector('.cds-media')).not.toBeNull();
    expect(container.querySelector('.cds-card--file')).not.toBeNull();
    expect(container.querySelector('.cds-card--link')).not.toBeNull();
    expect(container.querySelector('.cds-typing')).not.toBeNull();
    expect(screen.getByText(/named the conversation/)).toBeInTheDocument();
  });

  it('renders read receipts, unsent messages and composer text', () => {
    const pages = pagesOf(part1(), 's04');
    const { container } = render(<ScreenshotRenderer page={pages[pages.length - 1]!} characters={chars} />);
    expect(screen.getByText('Read Yesterday')).toBeInTheDocument();
    expect(screen.getByText('Casey unsent a message')).toBeInTheDocument();
    expect(container.querySelector('.cds-composer__field.has-text')).not.toBeNull();
  });

  it.each(['light', 'dark'] as const)('applies the %s screenshot theme independently', (theme) => {
    const { container } = render(<ScreenshotRenderer page={pagesOf(part1(), 's01', { theme })[0]!} characters={chars} />);
    expect(container.querySelector('.cds-screen')?.getAttribute('data-theme')).toBe(theme);
  });

  it.each(['iphone', 'vertical-9-16'] as const)('renders at the %s profile logical size', (profile) => {
    const page = pagesOf(part1(), 's01', { profile })[0]!;
    const { container } = render(<ScreenshotRenderer page={page} characters={chars} />);
    const el = container.querySelector<HTMLElement>('.cds-screen')!;
    expect(el.style.width).toBe(`${page.profile.width}px`);
    expect(el.style.height).toBe(`${page.profile.height}px`);
    expect(el.getAttribute('data-profile')).toBe(profile);
  });

  it('applies presentation color overrides', () => {
    const p = part1();
    p.screenshots[0]!.presentation = { outgoingBubbleColor: '#34C759' };
    const { container } = render(<ScreenshotRenderer page={buildPages(p, estimateMeasurer)[0]!} characters={chars} />);
    expect(container.querySelector<HTMLElement>('.cds-screen')!.style.getPropertyValue('--cds-out')).toBe('#34C759');
  });
});

describe('notification renderers', () => {
  it('renders a lock-screen notification with clock, date, sender and grouping', () => {
    const { container } = render(<ScreenshotRenderer page={pagesOf(part2(), 's01')[0]!} characters={chars} />);
    expect(screen.getByText('11:52')).toBeInTheDocument();
    expect(screen.getByText('Friday, January 16')).toBeInTheDocument();
    expect(screen.getByText('Jordan')).toBeInTheDocument();
    expect(screen.getByText('Missed Call')).toBeInTheDocument();
    expect(container.querySelector('.cds-notif--stacked')).not.toBeNull();
  });
  it('renders Notification Center with app group headers', () => {
    const { container } = render(<ScreenshotRenderer page={pagesOf(part2(), 's02')[0]!} characters={chars} />);
    expect(screen.getByText('Notification Center')).toBeInTheDocument();
    expect(container.querySelectorAll('.cds-nc__group').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('[data-notification-id]').length).toBeGreaterThan(1);
  });
});

describe('conversation list renderer', () => {
  it('renders pinned conversations, unread dots, previews, timestamps and muted icons', () => {
    const { container } = render(<ScreenshotRenderer page={pagesOf(part2(), 's03')[0]!} characters={chars} />);
    expect(container.querySelector('.cds-list__title')).toHaveTextContent('Messages');
    expect(container.querySelectorAll('.cds-pinned__item')).toHaveLength(3);
    expect(container.querySelector('.cds-pinned__dot')).not.toBeNull();
    expect(container.querySelectorAll('.cds-rowi.is-unread').length).toBeGreaterThan(0);
    expect(screen.getByText('Fixture preview 1')).toBeInTheDocument();
  });
  it('uses a compact header on continuation pages', () => {
    const pages = pagesOf(part2(), 's04');
    const { container } = render(<ScreenshotRenderer page={pages[1]!} characters={chars} />);
    expect(container.querySelector('.cds-list__compact')).not.toBeNull();
    expect(container.querySelector('.cds-pinned')).toBeNull();
  });
});

describe('export safety', () => {
  it('never puts CSS variables in SVG presentation attributes (they are lost in PNG export)', () => {
    const all = [...buildPages(part1(), estimateMeasurer), ...buildPages(part2(), estimateMeasurer, { theme: 'dark' })];
    const { container } = render(<>{all.map((p) => <ScreenshotRenderer key={p.key} page={p} characters={chars} />)}</>);
    const bad: string[] = [];
    container.querySelectorAll('svg, svg *').forEach((el) => {
      for (const attr of Array.from(el.attributes)) if (attr.name !== 'style' && attr.value.includes('var(')) bad.push(`${el.tagName}[${attr.name}=${attr.value}]`);
    });
    expect(bad).toEqual([]);
  });
});
