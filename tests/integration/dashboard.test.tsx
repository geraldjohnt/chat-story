import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/App';
import { CONTROLS_HIDE_DELAY } from '../../src/features/preview/ScreenshotViewer';
import { createGateConfig, type GateState } from '../../src/services/accessGate';
import { FIXTURE_ROOT, fileFetcher } from '../helpers/fixtures';

vi.mock('../../src/services/fonts', () => ({ ensureScreenshotFonts: () => Promise.resolve() }));

const openGate = () => Promise.resolve<GateState>({ status: 'disabled', reason: 'not-configured' });
const emptyManifest = JSON.stringify({ schemaVersion: 1, environment: 'production', stories: [] });

function renderAt(hash: string, fetcher = fileFetcher(FIXTURE_ROOT), gateLoader = openGate) {
  window.location.hash = hash;
  return { fetcher, ...render(<App fetcher={fetcher} gateLoader={gateLoader} />) };
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});
afterEach(() => {
  window.location.hash = '';
});

describe('dashboard home', () => {
  it('shows a loading state, then statistics derived from the manifest', async () => {
    renderAt('#/');
    expect(screen.getByRole('status')).toHaveTextContent(/Loading/);
    const stats = await screen.findByRole('region', { name: 'Library statistics' });
    const value = (label: string) => within(stats).getByText(label).previousElementSibling?.textContent;
    expect(value('Published stories')).toBe('2');
    expect(value('Total parts')).toBe('3');
    expect(value('Completed')).toBe('1');
    expect(value('Ongoing')).toBe('1');
    expect(screen.getByRole('heading', { name: 'Recently updated' })).toBeInTheDocument();
  });

  it('handles an empty library gracefully', async () => {
    renderAt('#/', fileFetcher(FIXTURE_ROOT, { 'manifest.json': emptyManifest }));
    expect(await screen.findByRole('heading', { name: 'No published stories yet' })).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Library statistics' })).getAllByText('0')).toHaveLength(6);
  });

  it('shows a retryable error when the manifest is missing, and recovers', async () => {
    let fail = true;
    const base = fileFetcher(FIXTURE_ROOT);
    const fetcher = async (url: string) => (fail ? new Response('', { status: 404 }) : base(url));
    renderAt('#/', fetcher as never);
    expect(await screen.findByRole('alert')).toHaveTextContent(/manifest.json was not found/);
    fail = false;
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('region', { name: 'Library statistics' })).toBeInTheDocument();
  });

  it('reports malformed manifest JSON without crashing', async () => {
    renderAt('#/', fileFetcher(FIXTURE_ROOT, { 'manifest.json': '{ nope' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/not valid JSON/);
  });

  it('isolates a story whose story.json is malformed', async () => {
    renderAt('#/library', fileFetcher(FIXTURE_ROOT, { '9002-fixture-completed-sample/story.json': '{"schemaVersion":1}' }));
    expect(await screen.findByText(/metadata failed to load/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Fixture: Renderer Coverage' })).toBeInTheDocument();
  });

  it('refreshes with a cache-busting token', async () => {
    const { fetcher } = renderAt('#/');
    await screen.findByRole('region', { name: 'Library statistics' });
    const before = fetcher.calls.length;
    await userEvent.click(screen.getByRole('button', { name: 'Refresh story library' }));
    await waitFor(() => expect(fetcher.calls.length).toBeGreaterThan(before));
    expect(fetcher.calls[fetcher.calls.length - 1]).toMatch(/\?v=\d+/);
  });
});

describe('story library', () => {
  it('searches across title and metadata, filters, and sorts', async () => {
    renderAt('#/library');
    const list = await screen.findByRole('list', { name: 'Stories' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    const user = userEvent.setup();
    await user.type(screen.getByRole('searchbox'), 'lighthouse');
    expect(within(screen.getByRole('list', { name: 'Stories' })).getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Fixture: Completed Sample' })).toBeInTheDocument();
    await user.clear(screen.getByRole('searchbox'));
    await user.type(screen.getByRole('searchbox'), 'Robin Wu'); // character name from story.json
    expect(screen.getByRole('link', { name: 'Fixture: Renderer Coverage' })).toBeInTheDocument();
    await user.clear(screen.getByRole('searchbox'));
    await user.type(screen.getByRole('searchbox'), 'zzzz-nothing');
    expect(screen.getByRole('heading', { name: 'No matching stories' })).toBeInTheDocument();
    await user.clear(screen.getByRole('searchbox'));

    await user.selectOptions(screen.getByLabelText('Status'), 'completed');
    expect(within(screen.getByRole('list', { name: 'Stories' })).getAllByRole('listitem')).toHaveLength(1);
    await user.selectOptions(screen.getByLabelText('Status'), '');
    await user.selectOptions(screen.getByLabelText('Genre'), 'fixture');
    expect(screen.getByRole('link', { name: 'Fixture: Renderer Coverage' })).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Genre'), '');

    const titles = () => within(screen.getByRole('list', { name: 'Stories' })).getAllByRole('heading').map((h) => h.textContent);
    await user.selectOptions(screen.getByLabelText('Sort by'), 'title');
    expect(titles()).toEqual(['Fixture: Completed Sample', 'Fixture: Renderer Coverage']);
    await user.selectOptions(screen.getByLabelText('Sort by'), 'updated');
    expect(titles()).toEqual(['Fixture: Renderer Coverage', 'Fixture: Completed Sample']);
    await user.selectOptions(screen.getByLabelText('Sort by'), 'created');
    expect(titles()).toEqual(['Fixture: Renderer Coverage', 'Fixture: Completed Sample']);
  });
});

describe('story overview and part reader', () => {
  it('shows story metadata and navigates to parts', async () => {
    renderAt('#/stories/9001');
    expect(await screen.findByRole('heading', { level: 1, name: 'Fixture: Renderer Coverage' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Characters' })).toBeInTheDocument();
    expect(screen.getAllByText('Avery Lane').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: 'Story arc' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('link', { name: /Part 2/ }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Notifications and inbox coverage' })).toBeInTheDocument();
  });

  it('renders the screenshot gallery and navigates between parts', async () => {
    renderAt('#/stories/9001/parts/1');
    const gallery = await screen.findByRole('list', { name: 'Screenshots' });
    expect(within(gallery).getAllByRole('listitem').length).toBeGreaterThan(4);
    expect(screen.getByText(/Part 1 of 2/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /← Part/ })).toBeNull();
    await userEvent.click(screen.getByRole('link', { name: 'Part 2 →' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Notifications and inbox coverage' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '← Part 1' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Part 3/ })).toBeNull();
  });

  it('applies temporary theme overrides without modifying source JSON', async () => {
    const before = readFileSync(`${FIXTURE_ROOT}/9001-fixture-renderer-coverage/part-1.json`, 'utf8');
    const { container } = renderAt('#/stories/9001/parts/1');
    await screen.findByRole('list', { name: 'Screenshots' });
    await userEvent.selectOptions(screen.getByLabelText('Screenshot theme'), 'dark');
    await waitFor(() => {
      const themes = Array.from(container.querySelectorAll('.gallery .cds-screen')).map((e) => e.getAttribute('data-theme'));
      expect(new Set(themes)).toEqual(new Set(['dark']));
    });
    await userEvent.selectOptions(screen.getByLabelText('Export profile'), 'vertical-9-16');
    await waitFor(() => expect(container.querySelector('.gallery .cds-screen')?.getAttribute('data-profile')).toBe('vertical-9-16'));
    expect(readFileSync(`${FIXTURE_ROOT}/9001-fixture-renderer-coverage/part-1.json`, 'utf8')).toBe(before);
  });

  it('shows an error for a malformed part file and offers retry', async () => {
    renderAt('#/stories/9001/parts/2', fileFetcher(FIXTURE_ROOT, { '9001-fixture-renderer-coverage/part-2.json': '{"schemaVersion":1,"storyId":"9001"}' }));
    expect(await screen.findByRole('heading', { name: 'Part 2 could not be loaded' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('handles unknown stories and parts', async () => {
    renderAt('#/stories/1234');
    expect(await screen.findByRole('heading', { name: 'Story not found' })).toBeInTheDocument();
    window.location.hash = '#/stories/9001/parts/9';
    expect(await screen.findByRole('heading', { name: 'Part not found' })).toBeInTheDocument();
  });

  it('opens and closes the fullscreen screenshot viewer with the keyboard', async () => {
    renderAt('#/stories/9001/parts/1');
    await screen.findByRole('list', { name: 'Screenshots' });
    await userEvent.click(screen.getByRole('button', { name: 'Open screenshot 1 preview' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('navigates the fullscreen viewer with buttons, arrow keys and swipes', async () => {
    renderAt('#/stories/9001/parts/1');
    const gallery = await screen.findByRole('list', { name: 'Screenshots' });
    const total = within(gallery).getAllByRole('listitem').length;
    expect(total).toBeGreaterThan(2);
    await userEvent.click(screen.getByRole('button', { name: 'Open screenshot 2 preview' }));
    const dialog = () => screen.getByRole('dialog');
    expect(dialog()).toHaveAccessibleName(`Screenshot 2 of ${total}`);

    await userEvent.click(screen.getByRole('button', { name: 'Next screenshot' }));
    expect(dialog()).toHaveAccessibleName(`Screenshot 3 of ${total}`);
    await userEvent.click(screen.getByRole('button', { name: 'Previous screenshot' }));
    expect(dialog()).toHaveAccessibleName(`Screenshot 2 of ${total}`);
    await userEvent.keyboard('{ArrowLeft}');
    expect(dialog()).toHaveAccessibleName(`Screenshot 1 of ${total}`);
    expect(screen.getByRole('button', { name: 'Previous screenshot' })).toBeDisabled();
    await userEvent.keyboard('{ArrowLeft}');
    expect(dialog()).toHaveAccessibleName(`Screenshot 1 of ${total}`);
    await userEvent.keyboard('{ArrowRight}');
    expect(dialog()).toHaveAccessibleName(`Screenshot 2 of ${total}`);

    const stage = screen.getByTestId('viewer-stage');
    const swipe = (from: number, to: number, y = 300) => {
      fireEvent.touchStart(stage, { touches: [{ clientX: from, clientY: y }] });
      fireEvent.touchMove(stage, { touches: [{ clientX: (from + to) / 2, clientY: y }] });
      fireEvent.touchEnd(stage, { touches: [], changedTouches: [{ clientX: to, clientY: y }] });
    };
    swipe(300, 100); // swipe left → next
    expect(dialog()).toHaveAccessibleName(`Screenshot 3 of ${total}`);
    swipe(100, 300); // swipe right → previous
    expect(dialog()).toHaveAccessibleName(`Screenshot 2 of ${total}`);
    swipe(200, 180); // too short to count
    expect(dialog()).toHaveAccessibleName(`Screenshot 2 of ${total}`);
    fireEvent.touchStart(stage, { touches: [{ clientX: 200, clientY: 100 }] });
    fireEvent.touchEnd(stage, { touches: [], changedTouches: [{ clientX: 140, clientY: 400 }] }); // mostly vertical
    expect(dialog()).toHaveAccessibleName(`Screenshot 2 of ${total}`);
  });

  it('auto-hides the viewer controls and toggles them with a tap', async () => {
    renderAt('#/stories/9001/parts/1');
    await screen.findByRole('list', { name: 'Screenshots' });
    vi.useFakeTimers();
    try {
      fireEvent.click(screen.getByRole('button', { name: 'Open screenshot 1 preview' }));
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('data-controls', 'visible');
      act(() => vi.advanceTimersByTime(CONTROLS_HIDE_DELAY + 50));
      expect(dialog).toHaveAttribute('data-controls', 'hidden');
      expect(screen.queryByRole('button', { name: 'Next screenshot' })).toBeNull();
      fireEvent.click(screen.getByTestId('viewer-stage'));
      expect(dialog).toHaveAttribute('data-controls', 'visible');
      expect(screen.getByRole('button', { name: 'Export PNG' })).toBeInTheDocument();
      fireEvent.click(screen.getByTestId('viewer-stage'));
      expect(dialog).toHaveAttribute('data-controls', 'hidden');
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('settings', () => {
  it('switches the dashboard theme and persists only the UI preference', async () => {
    renderAt('#/settings');
    await screen.findByRole('heading', { name: 'Dashboard theme' });
    await userEvent.click(screen.getByLabelText('Dark'));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(JSON.parse(localStorage.getItem('cds.preferences')!)).toEqual({ theme: 'dark' });
    await userEvent.click(screen.getByLabelText('Light'));
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(screen.getByTestId('gate-status')).toHaveTextContent('Not configured');
    expect(screen.getByText(/casual deterrent, not real protection/)).toBeInTheDocument();
  });

  it('generates a gate configuration locally without revealing the password', async () => {
    renderAt('#/settings');
    await screen.findByRole('heading', { name: 'Access gate' });
    await userEvent.click(screen.getByText('Set or change the password'));
    await userEvent.type(screen.getByLabelText('New password'), 'a-good-password');
    await userEvent.type(screen.getByLabelText('Confirm password'), 'a-good-password');
    await userEvent.click(screen.getByRole('button', { name: 'Generate configuration' }));
    const out = (await screen.findByLabelText('public/access-gate.json', {}, { timeout: 10000 })) as HTMLTextAreaElement;
    expect(out.value).toContain('"argon2id"');
    expect(out.value).not.toContain('a-good-password');
  });
});

describe('access gate', () => {
  it('blocks the app until the correct password is entered', async () => {
    const config = await createGateConfig('open-sesame-123');
    const loader = () => Promise.resolve<GateState>({ status: 'enabled', config });
    renderAt('#/', fileFetcher(FIXTURE_ROOT), loader);
    expect(await screen.findByRole('heading', { name: 'Chat Drama Studio' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Library statistics' })).toBeNull();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Unlock' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('not correct');
    await user.clear(screen.getByLabelText('Password'));
    await user.type(screen.getByLabelText('Password'), 'open-sesame-123');
    await user.click(screen.getByRole('button', { name: 'Unlock' }));
    expect(await screen.findByRole('region', { name: 'Library statistics' }, { timeout: 10000 })).toBeInTheDocument();
    expect(sessionStorage.getItem('cds.gate.unlocked')).not.toContain('open-sesame');
    await act(async () => {});
  });
});
