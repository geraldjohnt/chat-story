import { HashRouter, Route, Routes } from 'react-router-dom';
import { AccessGate } from './features/access/AccessGate';
import { LibraryProvider } from './features/library/LibraryContext';
import { PreferencesProvider } from './features/settings/PreferencesContext';
import { AppShell } from './layouts/AppShell';
import { HomePage } from './pages/HomePage';
import { LibraryPage } from './pages/LibraryPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PartPage } from './pages/PartPage';
import { SettingsPage } from './pages/SettingsPage';
import { StoryPage } from './pages/StoryPage';
import type { GateState } from './services/accessGate';
import type { Fetcher } from './services/storyRepository';

/** Hash routing keeps deep links working on GitHub Pages without a server-side fallback. */
export function App({ fetcher, gateLoader }: { fetcher?: Fetcher; gateLoader?: () => Promise<GateState> } = {}) {
  return (
    <PreferencesProvider>
      <AccessGate loader={gateLoader}>
        <LibraryProvider fetcher={fetcher}>
          <HashRouter>
            <Routes>
              <Route element={<AppShell />}>
                <Route index element={<HomePage />} />
                <Route path="library" element={<LibraryPage />} />
                <Route path="stories/:storyId" element={<StoryPage />} />
                <Route path="stories/:storyId/parts/:partNumber" element={<PartPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </HashRouter>
        </LibraryProvider>
      </AccessGate>
    </PreferencesProvider>
  );
}
