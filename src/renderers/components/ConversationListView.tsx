import type { ConversationListScreenshot, ConversationRow } from '../../types';
import { LIST, pinnedHeight, splitPinned } from '../pagination/conversationList';
import { displayName, type CharacterMap, type ScreenProps } from '../types';
import { Avatar, GroupAvatar } from './Avatar';
import { BellSlashIcon, ChevronRight, ComposeIcon, SearchIcon } from './icons';
import { HomeIndicator, StatusBar, Surface } from './Surface';

function rowName(row: ConversationRow, characters: CharacterMap, owner: string): string {
  if (row.name) return row.name;
  const others = row.participants.filter((p) => p !== owner);
  return (others.length ? others : row.participants).map((id) => displayName(characters, id)).join(', ');
}

function RowAvatar({ row, characters, owner, size }: { row: ConversationRow; characters: CharacterMap; owner: string; size: number }) {
  const others = row.participants.filter((p) => p !== owner);
  return others.length > 1
    ? <GroupAvatar characters={others.map((id) => characters.get(id))} size={size} />
    : <Avatar character={characters.get(others[0] ?? row.participants[0] ?? '')} size={size} />;
}

export function ConversationListView({ shot, page, pages, profile, characters }: ScreenProps<ConversationListScreenshot>) {
  const p = shot.presentation;
  const first = page === 1;
  const { pinned, regular } = first ? splitPinned(shot.conversations) : { pinned: [], regular: shot.conversations };
  const title = shot.title ?? 'Messages';
  return (
    <Surface profile={profile} theme={shot.theme} presentation={p} className="cds-list">
      {(p?.showStatusBar ?? true) && <StatusBar profile={profile} presentation={p} />}
      {first ? (
        <>
          <div className="cds-list__header" style={{ height: LIST.largeHeader }} data-page={page} data-pages={pages}>
            <div className="cds-list__bar"><span className="cds-link">Edit</span><ComposeIcon color="var(--cds-blue)" /></div>
            <div className="cds-list__title">{title}</div>
          </div>
          <div className="cds-list__search" style={{ height: LIST.searchBar }}>
            <span><SearchIcon color="var(--cds-secondary)" /> Search</span>
          </div>
        </>
      ) : (
        <div className="cds-list__compact" style={{ height: LIST.compactHeader }} data-page={page} data-pages={pages}>
          <span className="cds-link">Edit</span>
          <b>{title}</b>
          <ComposeIcon color="var(--cds-blue)" />
        </div>
      )}
      {pinned.length > 0 && (
        <div className="cds-pinned" style={{ height: pinnedHeight(pinned.length) }}>
          {pinned.map((row) => (
            <div key={row.id} className="cds-pinned__item" style={{ height: LIST.pinnedRowHeight }} data-row-id={row.id}>
              <div className="cds-pinned__avatar">
                <RowAvatar row={row} characters={characters} owner={shot.deviceOwner} size={66} />
                {(row.unread || (row.unreadCount ?? 0) > 0) && <span className="cds-pinned__dot" />}
              </div>
              <span className="cds-pinned__name">{rowName(row, characters, shot.deviceOwner).split(',')[0]}</span>
            </div>
          ))}
        </div>
      )}
      <ul className="cds-rows">
        {regular.map((row) => {
          const unread = row.unread || (row.unreadCount ?? 0) > 0;
          return (
            <li key={row.id} className={`cds-rowi ${unread ? 'is-unread' : ''}`} style={{ height: LIST.rowHeight }} data-row-id={row.id}>
              <span className="cds-rowi__dot">{unread && <i />}</span>
              <RowAvatar row={row} characters={characters} owner={shot.deviceOwner} size={50} />
              <div className="cds-rowi__main">
                <div className="cds-rowi__top">
                  <span className="cds-rowi__name">{rowName(row, characters, shot.deviceOwner)}</span>
                  <span className="cds-rowi__time">
                    {row.muted && <BellSlashIcon color="var(--cds-secondary)" />}
                    {row.time}
                    <ChevronRight size={11} color="var(--cds-tertiary)" />
                  </span>
                </div>
                <div className="cds-rowi__preview">{row.preview}</div>
              </div>
            </li>
          );
        })}
      </ul>
      <HomeIndicator profile={profile} />
    </Surface>
  );
}
