import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';
const KEY = 'cds.preferences';

interface Preferences {
  theme: ThemePreference;
}

interface PreferencesValue extends Preferences {
  resolvedTheme: 'light' | 'dark';
  setTheme(t: ThemePreference): void;
}

const Ctx = createContext<PreferencesValue | null>(null);

/** Only non-sensitive UI preferences are stored in localStorage. */
function read(): Preferences {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Preferences>;
    return { theme: raw.theme === 'light' || raw.theme === 'dark' || raw.theme === 'system' ? raw.theme : 'system' };
  } catch {
    return { theme: 'system' };
  }
}

function systemDark(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Preferences>(read);
  const [sysDark, setSysDark] = useState(systemDark);

  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const on = () => setSysDark(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);

  const resolvedTheme = prefs.theme === 'system' ? (sysDark ? 'dark' : 'light') : prefs.theme;

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  const setTheme = useCallback((theme: ThemePreference) => {
    setPrefs((p) => {
      const next = { ...p, theme };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  }, []);

  const value = useMemo(() => ({ ...prefs, resolvedTheme, setTheme }), [prefs, resolvedTheme, setTheme]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePreferences(): PreferencesValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('usePreferences must be used inside PreferencesProvider');
  return v;
}
