/** Minimal inline SVG icons used by the screenshot renderer (no external assets). */
import type { CSSProperties } from 'react';

type P = { size?: number; color?: string; style?: CSSProperties };

export const SignalIcon = ({ level = 4, color = 'currentColor' }: { level?: number; color?: string }) => (
  <svg style={{ color }} width="18" height="12" viewBox="0 0 18 12" aria-hidden="true">
    {[0, 1, 2, 3].map((i) => (
      <rect key={i} x={i * 4.6} y={9 - i * 3} width="3.2" height={3 + i * 3} rx="0.9" fill="currentColor" opacity={i < level ? 1 : 0.3} />
    ))}
  </svg>
);

export const WifiIcon = ({ color = 'currentColor' }: P) => (
  <svg style={{ color }} width="16" height="12" viewBox="0 0 16 12" aria-hidden="true">
    <path d="M8 11.6 5.6 9.2a3.4 3.4 0 0 1 4.8 0z" fill="currentColor" />
    <path d="M3.5 7.1a6.4 6.4 0 0 1 9 0l-1.2 1.2a4.7 4.7 0 0 0-6.6 0z" fill="currentColor" />
    <path d="M1.3 4.9a9.5 9.5 0 0 1 13.4 0l-1.2 1.2a7.8 7.8 0 0 0-11 0z" fill="currentColor" />
  </svg>
);

export const BatteryIcon = ({ level = 80, color = 'currentColor', charging = false }: { level?: number; color?: string; charging?: boolean }) => {
  const fill = level <= 20 ? '#FF3B30' : charging ? '#34C759' : 'currentColor';
  return (
    <svg style={{ color }} width="27" height="13" viewBox="0 0 27 13" aria-hidden="true">
      <rect x="0.5" y="0.5" width="23" height="12" rx="3.6" fill="none" stroke="currentColor" strokeOpacity="0.4" />
      <rect x="2" y="2" width={Math.max(1.5, (20 * level) / 100)} height="9" rx="2.2" fill={fill} />
      <path d="M25 4.5v4a2 2 0 0 0 0-4z" fill="currentColor" opacity="0.45" />
    </svg>
  );
};

export const ChevronLeft = ({ size = 22, color = 'currentColor' }: P) => (
  <svg style={{ color }} width={size * 0.55} height={size} viewBox="0 0 12 22" aria-hidden="true">
    <path d="M10 2 2 11l8 9" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ChevronRight = ({ size = 12, color = 'currentColor' }: P) => (
  <svg style={{ color }} width={size * 0.6} height={size} viewBox="0 0 8 13" aria-hidden="true">
    <path d="m1.5 1.5 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const VideoIcon = ({ color = 'currentColor' }: P) => (
  <svg style={{ color }} width="28" height="18" viewBox="0 0 28 18" aria-hidden="true">
    <rect x="1" y="2" width="18" height="14" rx="4" fill="currentColor" />
    <path d="m20.5 7 6-3.6v11.2l-6-3.6z" fill="currentColor" />
  </svg>
);

export const PlusIcon = ({ color = 'currentColor' }: P) => (
  <svg style={{ color }} width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const MicIcon = ({ color = 'currentColor' }: P) => (
  <svg style={{ color }} width="14" height="20" viewBox="0 0 14 20" aria-hidden="true">
    <rect x="4" y="1" width="6" height="11" rx="3" fill="currentColor" />
    <path d="M1.5 9a5.5 5.5 0 0 0 11 0M7 14.5V18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const SendArrow = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
    <circle cx="14" cy="14" r="14" fill="#0B84FE" />
    <path d="M14 20V8M8.8 13 14 7.8l5.2 5.2" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ComposeIcon = ({ color = 'currentColor' }: P) => (
  <svg style={{ color }} width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    <path d="M18.3 2.8a1.8 1.8 0 0 1 2.6 2.6L12 14.3l-3.5.9.9-3.5z" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
  </svg>
);

export const SearchIcon = ({ color = 'currentColor' }: P) => (
  <svg style={{ color }} width="15" height="15" viewBox="0 0 15 15" aria-hidden="true">
    <circle cx="6.2" cy="6.2" r="4.8" fill="none" stroke="currentColor" strokeWidth="1.8" />
    <path d="m10 10 3.8 3.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export const LockIcon = ({ color = 'currentColor' }: P) => (
  <svg style={{ color }} width="14" height="18" viewBox="0 0 14 18" aria-hidden="true">
    <path d="M3.5 8V5.5a3.5 3.5 0 0 1 7 0V8" fill="none" stroke="currentColor" strokeWidth="1.8" />
    <rect x="1" y="7.5" width="12" height="9.5" rx="2.2" fill="currentColor" />
  </svg>
);

export const FlashlightIcon = ({ color = 'currentColor' }: P) => (
  <svg style={{ color }} width="16" height="22" viewBox="0 0 16 22" aria-hidden="true">
    <path d="M3 1h10v4l-2 4v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V9L3 5z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    <circle cx="8" cy="13" r="1.4" fill="currentColor" />
  </svg>
);

export const CameraIcon = ({ color = 'currentColor' }: P) => (
  <svg style={{ color }} width="24" height="20" viewBox="0 0 24 20" aria-hidden="true">
    <path d="M3 5h4l2-3h6l2 3h4a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    <circle cx="12" cy="11.5" r="4" fill="none" stroke="currentColor" strokeWidth="1.7" />
  </svg>
);

export const BellSlashIcon = ({ color = 'currentColor' }: P) => (
  <svg style={{ color }} width="13" height="13" viewBox="0 0 14 14" aria-hidden="true">
    <path d="M7 1.5a3.6 3.6 0 0 0-3.6 3.6v2.7L2 10h10l-1.4-2.2V5.1A3.6 3.6 0 0 0 7 1.5zM5.6 11.4a1.4 1.4 0 0 0 2.8 0" fill="currentColor" />
    <path d="m1.5 1.5 11 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

export const PinIcon = ({ color = 'currentColor' }: P) => (
  <svg style={{ color }} width="11" height="13" viewBox="0 0 11 13" aria-hidden="true">
    <path d="M3 1h5l-.8 4 2.3 2.2H1.5L3.8 5z" fill="currentColor" /><path d="M5.5 7.5V12" stroke="currentColor" strokeWidth="1.3" />
  </svg>
);

/** App icons drawn as rounded squares (no trademarked artwork). */
export function AppIcon({ app, size = 38 }: { app: string; size?: number }) {
  const bg: Record<string, string> = {
    messages: 'linear-gradient(180deg,#5BF675,#0CBD2A)',
    phone: 'linear-gradient(180deg,#5BF675,#0CBD2A)',
    mail: 'linear-gradient(180deg,#1E9BFF,#1462F4)',
    calendar: '#FFFFFF',
    photos: 'conic-gradient(#FF9500,#FFCC00,#34C759,#5AC8FA,#AF52DE,#FF2D55,#FF9500)',
    social: 'linear-gradient(135deg,#7B5CFF,#FF4FA1)',
    other: 'linear-gradient(180deg,#9DA3AE,#6B7280)',
  };
  return (
    <div className="cds-app-icon" style={{ width: size, height: size, borderRadius: size * 0.225, background: bg[app] ?? bg.other }} aria-hidden="true">
      {app === 'messages' && (
        <svg width={size * 0.66} height={size * 0.6} viewBox="0 0 26 23"><path d="M13 1C6.4 1 1 5.3 1 10.6c0 3 1.8 5.7 4.6 7.5-.3 1.7-1.2 3.2-2.5 4.3 2.6 0 4.9-1 6.4-2.5 1.1.3 2.3.4 3.5.4 6.6 0 12-4.3 12-9.6S19.6 1 13 1z" fill="#fff" /></svg>
      )}
      {app === 'phone' && (
        <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24"><path d="M6.6 2.5c.6-.2 1.3 0 1.6.6l1.7 3.4c.3.6.2 1.3-.3 1.7L8 9.7a12 12 0 0 0 6.3 6.3l1.5-1.6c.4-.5 1.1-.6 1.7-.3l3.4 1.7c.6.3.9 1 .6 1.6l-.8 2.4c-.3.8-1 1.3-1.8 1.2C10 20.4 3.6 14 3.1 5.1 3 4.3 3.5 3.6 4.3 3.3z" fill="#fff" /></svg>
      )}
      {app === 'mail' && (
        <svg width={size * 0.6} height={size * 0.45} viewBox="0 0 24 17"><rect x="1" y="1" width="22" height="15" rx="2" fill="#fff" /><path d="m1.5 2 10.5 8 10.5-8" fill="none" stroke="#1E7BFF" strokeWidth="1.5" /></svg>
      )}
      {app === 'calendar' && <span style={{ color: '#FF3B30', fontWeight: 700, fontSize: size * 0.42 }}>31</span>}
    </div>
  );
}
