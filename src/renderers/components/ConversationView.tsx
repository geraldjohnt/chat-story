import type { CSSProperties } from 'react';
import type { ConversationScreenshot, MessageItem } from '../../types';
import { conversationMetrics } from '../metrics';
import { isGroupConversation, type RenderItem } from '../pagination/conversation';
import { displayName, type ScreenProps } from '../types';
import { Avatar, GroupAvatar } from './Avatar';
import { ChevronLeft, ChevronRight, MicIcon, PlusIcon, SendArrow, VideoIcon } from './icons';
import { HomeIndicator, StatusBar, Surface } from './Surface';

const REACTION_GLYPH: Record<string, string> = {
  heart: '♥', 'thumbs-up': '👍', 'thumbs-down': '👎', haha: 'HA', emphasis: '!!', question: '?',
};

function sameRun(a: RenderItem | undefined, b: RenderItem | undefined): boolean {
  if (!a || !b) return false;
  if ((a.kind !== 'message' && a.kind !== 'typing') || (b.kind !== 'message' && b.kind !== 'typing')) return false;
  return a.sender === b.sender;
}

export function ConversationView({ shot, page, pages, profile, characters }: ScreenProps<ConversationScreenshot>) {
  const group = isGroupConversation(shot);
  const p = shot.presentation;
  const m = conversationMetrics(profile, p?.fontScale ?? 1, group);
  const others = shot.participants.filter((id) => id !== shot.deviceOwner);
  const title = shot.title ?? (group ? others.map((id) => displayName(characters, id).split(' ')[0]).join(', ') : displayName(characters, others[0]));
  const showComposer = p?.showComposer ?? true;
  const showStatusBar = p?.showStatusBar ?? true;
  const items = shot.messages as RenderItem[];
  const vars = {
    '--cds-font': `${m.fontSize}px`,
    '--cds-line': `${m.lineHeight}px`,
    '--cds-bubble-max': `${m.bubbleMaxWidth}px`,
    '--cds-pad-y': `${m.bubblePadY}px`,
    '--cds-pad-x': `${m.bubblePadX}px`,
  } as CSSProperties;

  return (
    <Surface profile={profile} theme={shot.theme} presentation={p} className="cds-convo" style={vars}>
      <div className="cds-convo__top">
        {showStatusBar && <StatusBar profile={profile} presentation={p} />}
        <header className="cds-convo__header" style={{ height: m.headerHeight }}>
          <span className="cds-convo__back">
            <ChevronLeft color="var(--cds-blue)" />
            {(p?.backBadgeCount ?? 0) > 0 && <span className="cds-convo__badge">{p!.backBadgeCount}</span>}
          </span>
          <div className="cds-convo__who">
            {group ? (
              <GroupAvatar characters={others.map((id) => characters.get(id))} size={profile.id === 'iphone' ? 54 : 46} />
            ) : (
              <Avatar character={characters.get(others[0] ?? '')} size={profile.id === 'iphone' ? 54 : 46} />
            )}
            <span className="cds-convo__name">
              {title}
              <ChevronRight size={10} color="var(--cds-secondary)" />
            </span>
          </div>
          <span className="cds-convo__video"><VideoIcon color="var(--cds-blue)" /></span>
        </header>
      </div>
      <main
        className="cds-convo__area"
        style={{ paddingTop: m.areaPadTop, paddingBottom: m.areaPadBottom }}
        data-page={page}
        data-pages={pages}
      >
        {items.map((item, i) => {
          const prev = items[i - 1];
          const next = items[i + 1];
          const isFirst = i === 0;
          const newRun = isFirst || !sameRun(prev, item);
          const marginTop = isFirst ? 0 : newRun ? m.gapNewSender : m.gapSameSender;
          if (item.kind === 'timestamp') {
            return (
              <div key={item.id} className="cds-ts" style={{ marginTop, height: m.timestampHeight }} data-item-id={item.id}>
                {renderTimestamp(item.label)}
              </div>
            );
          }
          if (item.kind === 'system') {
            return (
              <div key={item.id} className="cds-system" style={{ marginTop, height: m.systemHeight }} data-item-id={item.id}>
                {item.text}
              </div>
            );
          }
          const outgoing = item.sender === shot.deviceOwner;
          const lastOfRun = !sameRun(item, next);
          const showLabel = group && newRun && !outgoing;
          const showAvatar = group && !outgoing;
          return (
            <div
              key={item.id}
              className={`cds-row ${outgoing ? 'cds-row--out' : 'cds-row--in'}`}
              style={{ marginTop, paddingLeft: showAvatar ? m.groupAvatarSpace : 0 }}
              data-item-id={item.id}
              data-sender={item.sender}
              data-direction={outgoing ? 'outgoing' : 'incoming'}
            >
              {showLabel && <div className="cds-sender" style={{ height: m.senderLabelHeight }}>{displayName(characters, item.sender).split(' ')[0]}</div>}
              {showAvatar && lastOfRun && (
                <div className="cds-row__avatar"><Avatar character={characters.get(item.sender)} size={28} /></div>
              )}
              {item.kind === 'typing' ? (
                <div className="cds-bubble cds-bubble--in cds-typing cds-tail" style={{ height: m.typingHeight }} aria-label="typing">
                  <i /><i /><i />
                </div>
              ) : (
                <Message item={item} outgoing={outgoing} tail={lastOfRun} m={m} hideReceipts={p?.hideReceipts ?? false} owner={shot.deviceOwner} name={displayName(characters, item.sender).split(' ')[0] ?? ''} />
              )}
            </div>
          );
        })}
      </main>
      {showComposer && (
        <footer className="cds-composer" style={{ height: m.composerHeight }}>
          <span className="cds-composer__plus"><PlusIcon color="var(--cds-secondary)" /></span>
          <span className={`cds-composer__field ${p?.composerText ? 'has-text' : ''}`}>
            <span className="cds-composer__text">{p?.composerText || 'iMessage'}</span>
            {p?.composerText ? <SendArrow /> : <MicIcon color="var(--cds-secondary)" />}
          </span>
        </footer>
      )}
      <HomeIndicator profile={profile} />
    </Surface>
  );
}

function renderTimestamp(label: string) {
  // "Today 9:41 PM" → bold day part, regular time part (iMessage style).
  const match = /^(.*?)(\s+(?:at\s+)?\d{1,2}:\d{2}\s?(?:AM|PM)?)$/i.exec(label);
  if (!match) return <span><b>{label}</b></span>;
  return <span><b>{match[1]}</b>{match[2]}</span>;
}

function Message({ item, outgoing, tail, m, hideReceipts, owner, name }: {
  item: MessageItem & { split?: { segment: number; segments?: number } };
  outgoing: boolean; tail: boolean; m: ReturnType<typeof conversationMetrics>; hideReceipts: boolean; owner: string; name: string;
}) {
  const dir = outgoing ? 'out' : 'in';
  if (item.unsent) {
    return <div className="cds-system" style={{ height: m.systemHeight, width: '100%' }}>{outgoing ? 'You unsent a message' : `${name} unsent a message`}</div>;
  }
  const hasReactions = !!item.reactions?.length;
  const att = item.attachment;
  return (
    <div className={`cds-msg cds-msg--${dir}`} style={{ paddingTop: hasReactions ? m.reactionSpace : 0 }}>
      {hasReactions && (
        <div className={`cds-reactions cds-reactions--${dir}`}>
          {item.reactions!.map((r, i) => (
            <span key={r.by + i} className={`cds-tapback ${r.by === owner ? 'is-mine' : ''}`} data-reaction={r.type} style={{ zIndex: 10 - i }}>
              <span className={`cds-tapback__glyph cds-tapback__glyph--${r.type}`}>{REACTION_GLYPH[r.type]}</span>
            </span>
          ))}
        </div>
      )}
      {att && (att.type === 'image' || att.type === 'video') && (
        <div className="cds-media" style={{ height: m.imageAttachmentHeight }}>
          <span className="cds-media__label">{att.type === 'video' ? '▶ ' : ''}{att.label}</span>
          {att.detail && <span className="cds-media__detail">{att.detail}</span>}
        </div>
      )}
      {att && att.type !== 'image' && att.type !== 'video' && (
        <div className={`cds-card cds-card--${att.type}`} style={{ height: m.cardAttachmentHeight }}>
          <span className="cds-card__icon" aria-hidden="true">{att.type === 'voice' ? '▶' : att.type === 'location' ? '⌖' : att.type === 'contact' ? '◉' : att.type === 'link' ? '🔗' : '📄'}</span>
          <span className="cds-card__text">
            <span className="cds-card__label">{att.label}</span>
            {att.detail && <span className="cds-card__detail">{att.detail}</span>}
          </span>
        </div>
      )}
      {item.text?.trim() && (
        <div
          className={`cds-bubble cds-bubble--${dir} ${tail ? 'cds-tail' : ''}`}
          style={att ? { marginTop: m.gapSameSender } : undefined}
        >
          {item.text}
        </div>
      )}
      {outgoing && item.receipt && !hideReceipts && (
        <div className="cds-receipt" style={{ height: m.receiptHeight }}>
          {receiptLabel(item.receipt.status, item.receipt.at)}
        </div>
      )}
    </div>
  );
}

function receiptLabel(status: string, at?: string): string {
  switch (status) {
    case 'read': return at ? `Read ${at}` : 'Read';
    case 'delivered': return 'Delivered';
    case 'sent': return 'Sent';
    case 'sending': return 'Sending…';
    case 'failed': return 'Not Delivered';
    default: return '';
  }
}

