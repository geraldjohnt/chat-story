import { useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useLibrary } from '../features/library/LibraryContext';

const NAV = [
  { to: '/', label: 'Home', icon: '⌂', end: true },
  { to: '/library', label: 'Library', icon: '▤', end: false },
  { to: '/settings', label: 'Settings', icon: '⚙', end: false },
];

function Freshness() {
  const { library, refreshing, refresh, error, status } = useLibrary();
  const time = library?.loadedAt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return (
    <div className="freshness">
      <span className="freshness__text" aria-live="polite">
        {refreshing ? 'Refreshing…' : status === 'ready' && error ? <span className="warn-text">Refresh failed — showing data from {time}</span> : time ? `Loaded ${time}` : ''}
      </span>
      <button className="btn btn--small" onClick={() => void refresh()} disabled={refreshing} aria-label="Refresh story library">
        <span aria-hidden="true">↻</span> Refresh
      </button>
    </div>
  );
}

export function AppShell() {
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const firstRender = useRef(true);
  // Move focus to main content after in-app navigation (not on first load) for keyboard and screen-reader users.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    mainRef.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="shell">
      <a className="skip-link" href="#main" onClick={(e) => { e.preventDefault(); mainRef.current?.focus(); }}>Skip to content</a>
      <aside className="sidebar" aria-label="Primary">
        <div className="brand"><span className="brand__mark" aria-hidden="true" /><span>Chat Drama Studio</span></div>
        <nav>
          <ul>
            {NAV.map((n) => (
              <li key={n.to}>
                <NavLink to={n.to} end={n.end} className={({ isActive }) => `nav-link ${isActive ? 'is-active' : ''}`}>
                  <span aria-hidden="true" className="nav-link__icon">{n.icon}</span>{n.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <p className="sidebar__note">Read-only story browser. Stories are authored with Claude Code and published through Git.</p>
      </aside>
      <div className="shell__body">
        <header className="topbar">
          <div className="brand brand--mobile"><span className="brand__mark" aria-hidden="true" /><span>Chat Drama Studio</span></div>
          <Freshness />
        </header>
        <main id="main" ref={mainRef} tabIndex={-1} className="content">
          <Outlet />
        </main>
      </div>
      <nav className="tabbar" aria-label="Primary (mobile)">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `tabbar__item ${isActive ? 'is-active' : ''}`}>
            <span aria-hidden="true">{n.icon}</span>
            <span>{n.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
