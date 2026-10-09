import { useState, type FormEvent } from 'react';
import { PageHeader } from '../components/ui';
import { useGate } from '../features/access/AccessGate';
import { useLibrary } from '../features/library/LibraryContext';
import { usePreferences, type ThemePreference } from '../features/settings/PreferencesContext';
import { EXPORT_PROFILES } from '../renderers/profiles';
import { createGateConfig } from '../services/accessGate';

const REPO_FILE = 'public/access-gate.json';

function GateGenerator() {
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [out, setOut] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    setOut('');
    setCopied(false);
    if (pw !== confirm) return setErr('The passwords do not match.');
    setBusy(true);
    try {
      const config = await createGateConfig(pw);
      setOut(JSON.stringify(config, null, 2) + '\n');
      setPw('');
      setConfirm('');
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="stack">
      <p className="small">Generates the gate configuration <strong>locally in this browser</strong> (Argon2id with a random salt). The password is never sent anywhere and is not stored. Copy the result into <code>{REPO_FILE}</code> in the repository (for example with the GitHub mobile site: open the file → ✎ edit → paste → commit).</p>
      <div className="row">
        <label className="field"><span>New password</span><input type="password" autoComplete="new-password" minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} required /></label>
        <label className="field"><span>Confirm password</span><input type="password" autoComplete="new-password" minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} required /></label>
      </div>
      {err && <p className="error-text" role="alert">{err}</p>}
      <div><button className="btn" disabled={busy || !pw}>{busy ? 'Deriving hash…' : 'Generate configuration'}</button></div>
      {out && (
        <div className="stack">
          <label className="field"><span>{REPO_FILE}</span><textarea readOnly rows={12} value={out} className="code" onFocus={(e) => e.currentTarget.select()} /></label>
          <div>
            <button type="button" className="btn btn--small" onClick={() => navigator.clipboard?.writeText(out).then(() => setCopied(true), () => setErr('Copy failed — select the text and copy it manually.'))}>
              {copied ? 'Copied' : 'Copy to clipboard'}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}

export function SettingsPage() {
  const { theme, setTheme, resolvedTheme } = usePreferences();
  const { state, lockNow } = useGate();
  const { baseUrl, library } = useLibrary();
  const options: { value: ThemePreference; label: string }[] = [
    { value: 'system', label: 'System' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
  ];
  return (
    <>
      <PageHeader title="Settings" subtitle="Dashboard preferences. These never modify story files." />
      <section className="card section" aria-labelledby="theme-title">
        <h2 id="theme-title">Dashboard theme</h2>
        <fieldset className="segmented">
          <legend className="sr-only">Dashboard theme</legend>
          {options.map((o) => (
            <label key={o.value} className={`segmented__item ${theme === o.value ? 'is-active' : ''}`}>
              <input type="radio" name="theme" value={o.value} checked={theme === o.value} onChange={() => setTheme(o.value)} />
              {o.label}
            </label>
          ))}
        </fieldset>
        <p className="muted small">Currently showing the {resolvedTheme} theme. Each screenshot keeps its own light/dark theme from the story data; you can override it temporarily on a part page.</p>
      </section>

      <section className="card section" aria-labelledby="gate-title">
        <h2 id="gate-title">Access gate</h2>
        <p>
          Status:{' '}
          <strong data-testid="gate-status">
            {state?.status === 'enabled' ? 'Enabled' : state?.status === 'invalid' ? 'Invalid configuration' : state?.status === 'disabled' && state.reason === 'turned-off' ? 'Disabled in configuration' : 'Not configured'}
          </strong>
          {state?.status === 'invalid' && <span className="error-text"> — {state.message}</span>}
        </p>
        {state?.status === 'enabled' && <p><button className="btn btn--small" onClick={lockNow}>Lock now</button></p>}
        <div className="notice" role="note">
          <strong>Security limitation.</strong> This is a casual deterrent, not real protection. The site is static: the hash configuration,
          the verification code and every published story JSON file can be downloaded directly by anyone who has the URL, password or not.
          Do not publish anything that must stay confidential. Real confidentiality would need protected hosting or an authenticated backend.
        </div>
        <details>
          <summary>Set or change the password</summary>
          <GateGenerator />
          <p className="small muted">Alternatively, in a terminal run <code>npm run setup:password</code>. To disable the gate, set <code>"enabled": false</code> or delete the file. The configured password is never shown here.</p>
        </details>
      </section>

      <section className="card section" aria-labelledby="export-title">
        <h2 id="export-title">Export profiles</h2>
        <ul className="small">
          {Object.values(EXPORT_PROFILES).map((p) => <li key={p.id}><strong>{p.id}</strong>: {p.pixelWidth} × {p.pixelHeight} px — {p.description}</li>)}
        </ul>
        <p className="muted small">PNG and ZIP exports are rendered in your browser. Some mobile browsers (notably older iOS Safari) may open images in a new view instead of downloading; use “Save to Files” or share from there.</p>
      </section>

      <section className="card section" aria-labelledby="data-title">
        <h2 id="data-title">Data source</h2>
        <p className="small">Stories load read-only from <code>{baseUrl}manifest.json</code> ({library?.manifest.stories.length ?? 0} published). The dashboard cannot edit or write stories — authoring happens in Claude Code and is published through Git.</p>
      </section>
    </>
  );
}
