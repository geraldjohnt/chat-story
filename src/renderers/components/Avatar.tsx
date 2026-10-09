import type { Character } from '../../types';

export function initialsFor(c: Pick<Character, 'name' | 'avatar'> | undefined, fallback = '?'): string {
  if (!c) return fallback;
  if (c.avatar?.initials) return c.avatar.initials.toUpperCase();
  const words = c.name.trim().split(/\s+/);
  return ((words[0]?.[0] ?? '') + (words.length > 1 ? (words[words.length - 1]?.[0] ?? '') : '')).toUpperCase() || fallback;
}

/** iOS-style monogram avatar: soft gray gradient with white initials (or a custom color). */
export function Avatar({ character, size, label }: { character?: Character; size: number; label?: string }) {
  const color = character?.avatar?.color;
  const background = color ?? 'linear-gradient(180deg,#A5ABB8 0%,#858994 100%)';
  return (
    <div
      className="cds-avatar"
      style={{ width: size, height: size, background, fontSize: Math.round(size * 0.42) }}
      aria-label={label ?? character?.name}
    >
      {initialsFor(character)}
    </div>
  );
}

export function GroupAvatar({ characters, size }: { characters: (Character | undefined)[]; size: number }) {
  const shown = characters.slice(0, 3);
  const small = Math.round(size * 0.58);
  const positions = [
    { left: 0, top: size * 0.08 },
    { left: size - small, top: 0 },
    { left: (size - small) / 2, top: size - small },
  ];
  return (
    <div className="cds-group-avatar" style={{ width: size, height: size }}>
      {shown.map((c, i) => (
        <div key={c?.id ?? i} style={{ position: 'absolute', ...positions[i] }}>
          <Avatar character={c} size={small} />
        </div>
      ))}
    </div>
  );
}
