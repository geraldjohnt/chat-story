import { createContext, useContext, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { isUnlocked, loadGateConfig, lock, markUnlocked, verifyPassword, type GateState } from '../../services/accessGate';

interface GateValue {
  state: GateState | null;
  lockNow(): void;
}
const Ctx = createContext<GateValue>({ state: null, lockNow: () => {} });
export const useGate = () => useContext(Ctx);

/**
 * Casual access deterrent. When public/access-gate.json is missing or disabled, the app is open.
 * This does NOT make published files private — see README "Security limitations".
 */
export function AccessGate({ children, loader }: { children: ReactNode; loader?: () => Promise<GateState> }) {
  const [state, setState] = useState<GateState | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    void (loader ?? loadGateConfig)().then((s) => {
      if (!alive) return;
      setState(s);
      setUnlocked(s.status !== 'enabled' || isUnlocked(s.config));
    });
    return () => {
      alive = false;
    };
  }, [loader]);

  const lockNow = () => {
    lock();
    if (state?.status === 'enabled') setUnlocked(false);
  };

  if (!state) {
    return <div className="gate"><p className="muted" role="status">Loading…</p></div>;
  }

  if (state.status === 'enabled' && !unlocked) {
    const config = state.config;
    const submit = async (e: FormEvent) => {
      e.preventDefault();
      setChecking(true);
      setError('');
      try {
        if (await verifyPassword(password, config)) {
          markUnlocked(config);
          setPassword('');
          setUnlocked(true);
        } else {
          setError('That password is not correct.');
        }
      } catch {
        setError('Could not verify the password in this browser.');
      } finally {
        setChecking(false);
      }
    };
    return (
      <div className="gate">
        <form className="gate__card card" onSubmit={submit} aria-labelledby="gate-title">
          <div className="brand brand--large" aria-hidden="true"><span className="brand__mark" /></div>
          <h1 id="gate-title">Chat Drama Studio</h1>
          <p className="muted">Enter the access password to continue.</p>
          <label className="field">
            <span>Password</span>
            <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus />
          </label>
          {error && <p className="error-text" role="alert">{error}</p>}
          <button className="btn btn--primary" type="submit" disabled={checking || !password}>{checking ? 'Checking…' : 'Unlock'}</button>
          <p className="fine-print">This is a casual access gate, not encryption. Published files remain publicly downloadable.</p>
        </form>
      </div>
    );
  }

  return <Ctx.Provider value={{ state, lockNow }}>{children}</Ctx.Provider>;
}
