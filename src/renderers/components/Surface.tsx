import type { CSSProperties, ReactNode } from 'react';
import type { Presentation, ScreenshotTheme } from '../../types';
import { FONT_FAMILY } from '../measure';
import type { ExportProfile } from '../profiles';
import { BatteryIcon, SignalIcon, WifiIcon } from './icons';

export function StatusBar({ profile, presentation, light }: { profile: ExportProfile; presentation?: Presentation; light?: boolean }) {
  const sb = presentation?.statusBar ?? {};
  const color = light ? '#FFFFFF' : 'var(--cds-text)';
  return (
    <div className={`cds-status ${profile.island ? 'cds-status--island' : ''}`} style={{ height: profile.statusBarHeight, color }}>
      <span className="cds-status__time">{sb.time ?? '9:41'}</span>
      {profile.island && <span className="cds-status__island" aria-hidden="true" />}
      <span className="cds-status__icons">
        <SignalIcon level={sb.signal ?? 4} color={color} />
        {(sb.wifi ?? true) && <WifiIcon color={color} />}
        <BatteryIcon level={sb.battery ?? 82} color={color} charging={sb.charging} />
      </span>
    </div>
  );
}

export function HomeIndicator({ profile, light }: { profile: ExportProfile; light?: boolean }) {
  return (
    <div className="cds-home" style={{ height: profile.homeIndicatorHeight }}>
      <span style={{ background: light ? 'rgba(255,255,255,0.9)' : 'var(--cds-text)' }} />
    </div>
  );
}

/** Root of every rendered screenshot. Fixed logical size; theme tokens via data-theme. */
export function Surface({
  profile, theme, presentation, children, className = '', style,
}: {
  profile: ExportProfile;
  theme: ScreenshotTheme;
  presentation?: Presentation;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const vars: Record<string, string | number> = {
    width: profile.width,
    height: profile.height,
    fontFamily: FONT_FAMILY,
  };
  if (presentation?.outgoingBubbleColor) vars['--cds-out'] = presentation.outgoingBubbleColor;
  if (presentation?.incomingBubbleColor) vars['--cds-in'] = presentation.incomingBubbleColor;
  if (presentation?.backgroundColor) vars['--cds-bg'] = presentation.backgroundColor;
  return (
    <div
      className={`cds-screen ${className}`}
      data-theme={theme}
      data-profile={profile.id}
      style={{ ...(vars as CSSProperties), ...style }}
    >
      {children}
    </div>
  );
}
