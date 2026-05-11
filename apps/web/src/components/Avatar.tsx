import styles from './Avatar.module.css';

export type AvatarProps = {
  name: string | null;
  size?: number;
  active?: boolean;
};

function hashHue(name: string): number {
  let h = 5381;
  for (let i = 0; i < name.length; i++) {
    h = ((h * 33) ^ name.charCodeAt(i)) >>> 0;
  }
  return h % 360;
}

function pickInitial(name: string | null): string {
  if (!name) return '—';
  // Skip emoji + leading spaces; take first letter glyph we can find.
  const stripped = name.replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}\s]+/u, '').trim();
  const first = stripped.charAt(0);
  return (first || name.charAt(0) || '?').toUpperCase();
}

export function Avatar({ name, size = 56, active = false }: AvatarProps): JSX.Element {
  const initial = pickInitial(name);
  const hue = name ? hashHue(name) : 0;
  const bg = name
    ? `hsl(${hue}, 55%, 45%)`
    : 'rgba(255,255,255,0.15)';
  return (
    <div
      className={`${styles.avatar} ${active ? styles.active : ''}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.45),
        background: bg,
      }}
      data-testid="avatar"
    >
      {initial}
    </div>
  );
}
