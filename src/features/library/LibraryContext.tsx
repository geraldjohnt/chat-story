import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { storiesBaseUrl } from '../../services/dataSource';
import { DataLoadError, loadLibrary, type Fetcher, type Library } from '../../services/storyRepository';

type Status = 'loading' | 'ready' | 'error';

interface LibraryValue {
  status: Status;
  library: Library | null;
  error: DataLoadError | null;
  refreshing: boolean;
  /** Token for cache-busting part requests after a refresh. */
  cacheToken: string | undefined;
  baseUrl: string;
  fetcher?: Fetcher;
  refresh(): Promise<void>;
}

const Ctx = createContext<LibraryValue | null>(null);
const VISIBILITY_REFRESH_MS = 5 * 60 * 1000;

export function LibraryProvider({ children, fetcher }: { children: ReactNode; fetcher?: Fetcher }) {
  const baseUrl = storiesBaseUrl();
  const [status, setStatus] = useState<Status>('loading');
  const [library, setLibrary] = useState<Library | null>(null);
  const [error, setError] = useState<DataLoadError | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [cacheToken, setCacheToken] = useState<string | undefined>(undefined);
  const lastLoad = useRef(0);
  const inFlight = useRef<Promise<void> | null>(null);

  const load = useCallback(
    (token?: string) => {
      if (inFlight.current) return inFlight.current;
      setRefreshing(true);
      const p = loadLibrary({ baseUrl, cacheToken: token, fetcher })
        .then((lib) => {
          setLibrary(lib);
          setError(null);
          setStatus('ready');
          setCacheToken(token);
        })
        .catch((e: unknown) => {
          setError(e instanceof DataLoadError ? e : new DataLoadError(String(e), 'network'));
          // Keep showing previously loaded data (marked stale) if a refresh fails.
          setStatus((s) => (s === 'ready' ? 'ready' : 'error'));
        })
        .finally(() => {
          lastLoad.current = Date.now();
          setRefreshing(false);
          inFlight.current = null;
        });
      inFlight.current = p;
      return p;
    },
    [baseUrl, fetcher],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = useCallback(() => load(String(Date.now())), [load]);

  // Refresh when the tab becomes visible again, at most every 5 minutes.
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastLoad.current > VISIBILITY_REFRESH_MS) void refresh();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [refresh]);

  const value = useMemo(
    () => ({ status, library, error, refreshing, cacheToken, baseUrl, fetcher, refresh }),
    [status, library, error, refreshing, cacheToken, baseUrl, fetcher, refresh],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLibrary(): LibraryValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useLibrary must be used inside LibraryProvider');
  return v;
}
