import type { CSSProperties } from 'react';
import type { NotificationCenterScreenshot, NotificationItem, NotificationScreenshot, Presentation, ScreenshotTheme } from '../../types';
import { NOTIF } from '../pagination/notifications';
import type { ExportProfile } from '../profiles';
import { displayName, type CharacterMap, type ScreenProps } from '../types';
import { Avatar } from './Avatar';
import { AppIcon, CameraIcon, FlashlightIcon, LockIcon } from './icons';
import { HomeIndicator, StatusBar, Surface } from './Surface';

const APP_NAMES: Record<string, string> = {
  messages: 'Messages', phone: 'Phone', mail: 'Mail', calendar: 'Calendar', photos: 'Photos', social: 'Social', other: 'Notification',
};

function wallpaper(theme: ScreenshotTheme, p?: Presentation): string {
  if (p?.wallpaper) return `linear-gradient(${p.wallpaper.angle ?? 160}deg, ${p.wallpaper.from}, ${p.wallpaper.to})`;
  return theme === 'dark'
    ? 'radial-gradient(120% 80% at 20% 10%, #3B2D6B 0%, rgba(59,45,107,0) 60%), radial-gradient(120% 90% at 90% 90%, #0F4C6E 0%, rgba(15,76,110,0) 60%), linear-gradient(170deg,#141625,#06070D)'
    : 'radial-gradient(120% 80% at 15% 5%, #F7B6C8 0%, rgba(247,182,200,0) 55%), radial-gradient(120% 90% at 95% 95%, #7FB2F0 0%, rgba(127,178,240,0) 60%), linear-gradient(170deg,#C9B8F2,#6E8FD8)';
}

export function NotificationCard({ n, characters, profile, scale = 1 }: { n: NotificationItem; characters: CharacterMap; profile: ExportProfile; scale?: number }) {
  const title = n.title ?? displayName(characters, n.sender);
  const stacked = (n.groupCount ?? 1) > 1;
  const style = { '--cds-nbody': `${NOTIF.bodyFont * scale}px`, '--cds-nline': `${NOTIF.bodyLine * scale}px`, '--cds-ntitle': `${NOTIF.titleLine * scale}px` } as CSSProperties;
  return (
    <div className={`cds-notif ${stacked ? 'cds-notif--stacked' : ''}`} style={{ ...style, marginLeft: NOTIF.sidePad, marginRight: NOTIF.sidePad, paddingBottom: stacked ? NOTIF.stackExtra : 0 }} data-notification-id={n.id}>
      <div className="cds-notif__card" style={{ padding: `${NOTIF.cardPadY}px ${NOTIF.cardPadX}px`, minHeight: NOTIF.iconSize + NOTIF.cardPadY * 2 }}>
        <div className="cds-notif__icon">
          {n.app === 'messages' && n.sender ? (
            <div className="cds-notif__contact">
              <Avatar character={characters.get(n.sender)} size={NOTIF.iconSize} />
              <span className="cds-notif__badge"><AppIcon app="messages" size={16} /></span>
            </div>
          ) : (
            <AppIcon app={n.app} size={NOTIF.iconSize} />
          )}
        </div>
        <div className="cds-notif__content" style={{ width: profile.width - NOTIF.sidePad * 2 - NOTIF.cardPadX * 2 - NOTIF.iconSize - 10 }}>
          <div className="cds-notif__head">
            <span className="cds-notif__title">{title}</span>
            <span className="cds-notif__time">{n.time}</span>
          </div>
          <div className="cds-notif__body">{n.body}</div>
        </div>
      </div>
      {stacked && (
        <>
          <div className="cds-notif__layer cds-notif__layer--1" />
          <div className="cds-notif__layer cds-notif__layer--2" />
        </>
      )}
    </div>
  );
}

export function NotificationView({ shot, page, pages, profile, characters }: ScreenProps<NotificationScreenshot>) {
  const p = shot.presentation;
  return (
    <Surface profile={profile} theme={shot.theme} presentation={p} className="cds-lock" style={{ background: wallpaper(shot.theme, p) }}>
      {(p?.showStatusBar ?? true) && <StatusBar profile={profile} presentation={p} light />}
      <div className="cds-lock__clock" style={{ height: NOTIF.lockClockArea }} data-page={page} data-pages={pages}>
        <LockIcon color="rgba(255,255,255,0.95)" />
        <div className="cds-lock__date">{shot.lockScreen.date}</div>
        <div className="cds-lock__time">{shot.lockScreen.time}</div>
      </div>
      <div className="cds-lock__list">
        {shot.notifications.map((n, i) => (
          <div key={n.id} style={{ marginTop: i === 0 ? 0 : NOTIF.gap }}>
            <NotificationCard n={n} characters={characters} profile={profile} scale={p?.fontScale ?? 1} />
          </div>
        ))}
      </div>
      <div className="cds-lock__controls" style={{ height: NOTIF.lockBottomControls }}>
        <span className="cds-lock__btn"><FlashlightIcon color="#fff" /></span>
        <span className="cds-lock__btn"><CameraIcon color="#fff" /></span>
      </div>
      <HomeIndicator profile={profile} light />
    </Surface>
  );
}

export function NotificationCenterView({ shot, page, pages, profile, characters }: ScreenProps<NotificationCenterScreenshot>) {
  const p = shot.presentation;
  return (
    <Surface profile={profile} theme={shot.theme} presentation={p} className="cds-nc" style={{ background: wallpaper(shot.theme, p) }}>
      <div className="cds-nc__dim" />
      {(p?.showStatusBar ?? true) && <StatusBar profile={profile} presentation={p} light />}
      <div className="cds-nc__header" style={{ height: NOTIF.centerHeader }} data-page={page} data-pages={pages}>
        <div className="cds-nc__date">{shot.lockScreen.date}</div>
        <div className="cds-nc__time">{shot.lockScreen.time}</div>
        <div className="cds-nc__title">Notification Center</div>
      </div>
      <div className="cds-nc__list">
        {shot.notifications.map((n, i) => {
          const prev = shot.notifications[i - 1];
          const header = i === 0 || prev?.app !== n.app;
          return (
            <div key={n.id} style={{ marginTop: i === 0 ? 0 : NOTIF.gap }}>
              {header && (
                <div className="cds-nc__group" style={{ height: NOTIF.groupHeader }}>
                  <span>{n.appName ?? APP_NAMES[n.app]}</span>
                  <span className="cds-nc__group-actions">Show less <b>×</b></span>
                </div>
              )}
              <NotificationCard n={n} characters={characters} profile={profile} scale={p?.fontScale ?? 1} />
            </div>
          );
        })}
      </div>
      <HomeIndicator profile={profile} light />
    </Surface>
  );
}
