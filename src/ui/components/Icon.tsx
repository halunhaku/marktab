import type { JSX } from 'preact';

/**
 * Icon set.
 *
 * Hand-drawn on a 24×24 grid with a single stroke weight so every glyph in the
 * product shares one optical density. Keeping them inline (rather than shipping
 * an icon font or fetching SVGs at runtime) matters twice over: MV3 forbids
 * remote assets, and inline paths cannot flash in after first paint.
 */
interface IconSpec {
  /** Stroked paths. */
  d?: readonly string[];
  /** Stroked circles: `[cx, cy, r]`. */
  circles?: readonly (readonly [number, number, number])[];
  /** Filled dots: `[cx, cy, r]`. */
  dots?: readonly (readonly [number, number, number])[];
  /** Rounded rectangles: `[x, y, width, height, radius]`. */
  rects?: readonly (readonly [number, number, number, number, number])[];
  /** Fill the stroked paths with the current colour instead of outlining them. */
  filled?: boolean;
}

const ICONS = {
  home: { d: ['M4 10.6 12 4l8 6.6', 'M6.3 9.9V19.1a1 1 0 0 0 1 1h9.4a1 1 0 0 0 1-1V9.9'] },
  clock: { circles: [[12, 12, 8.5]], d: ['M12 7.6V12.3l3.1 1.9'] },
  pin: {
    d: [
      'M8.6 3.6h6.8a.9.9 0 0 1 .88 1.13l-.95 4.02 2.05 2.4A.95.95 0 0 1 16.66 12.8H7.34a.95.95 0 0 1-.72-1.65l2.05-2.4-.95-4.02A.9.9 0 0 1 8.6 3.6Z',
      'M12 12.9v7.2',
    ],
  },
  pinFilled: { filled: true, d: ['M8.6 3.6h6.8a.9.9 0 0 1 .88 1.13l-.95 4.02 2.05 2.4A.95.95 0 0 1 16.66 12.8H7.34a.95.95 0 0 1-.72-1.65l2.05-2.4-.95-4.02A.9.9 0 0 1 8.6 3.6ZM11.2 12.9h1.6v7.2h-1.6Z'] },
  folder: {
    d: ['M3.6 7.4a2 2 0 0 1 2-2h3.2l1.9 2.3h8.7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5.6a2 2 0 0 1-2-2Z'],
  },
  folderMove: {
    d: [
      'M3.6 7.4a2 2 0 0 1 2-2h3.2l1.9 2.3h8.7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5.6a2 2 0 0 1-2-2Z',
      'M12 10.6v6.2',
      'M9.5 14.3 12 16.8l2.5-2.5',
    ],
  },
  search: { circles: [[11, 11, 6.4]], d: ['M15.6 15.6 20.4 20.4'] },
  sliders: {
    d: ['M5.5 4.5v6.2', 'M5.5 15.3v4.2', 'M12 4.5v4.2', 'M12 13.3v6.2', 'M18.5 4.5v8.6', 'M18.5 17.7v1.8'],
    dots: [
      [5.5, 13, 2.1],
      [12, 11, 2.1],
      [18.5, 15.4, 2.1],
    ],
  },
  sun: {
    circles: [[12, 12, 4.2]],
    d: [
      'M12 2.5v2.2',
      'M12 19.3v2.2',
      'M2.5 12h2.2',
      'M19.3 12h2.2',
      'M5.6 5.6 7.2 7.2',
      'M16.8 16.8l1.6 1.6',
      'M18.4 5.6 16.8 7.2',
      'M7.2 16.8 5.6 18.4',
    ],
  },
  moon: { d: ['M20 14.2A8.6 8.6 0 0 1 9.8 4a8.6 8.6 0 1 0 10.2 10.2Z'] },
  monitor: {
    d: [
      'M5 5.6h14a1.6 1.6 0 0 1 1.6 1.6v7.4a1.6 1.6 0 0 1-1.6 1.6H5a1.6 1.6 0 0 1-1.6-1.6V7.2A1.6 1.6 0 0 1 5 5.6Z',
      'M9 19.4h6',
      'M12 16.2v3.2',
    ],
  },
  grid: {
    rects: [
      [4.2, 4.2, 6.6, 6.6, 1.8],
      [13.2, 4.2, 6.6, 6.6, 1.8],
      [4.2, 13.2, 6.6, 6.6, 1.8],
      [13.2, 13.2, 6.6, 6.6, 1.8],
    ],
  },
  list: { d: ['M4 7h16', 'M4 12h16', 'M4 17h10'] },
  plus: { d: ['M12 5v14', 'M5 12h14'] },
  minus: { d: ['M5 12h14'] },
  moreVertical: {
    dots: [
      [12, 6, 1.6],
      [12, 12, 1.6],
      [12, 18, 1.6],
    ],
  },
  close: { d: ['M6.4 6.4 17.6 17.6', 'M17.6 6.4 6.4 17.6'] },
  check: { d: ['M5.6 12.8 9.9 17 18.4 7.6'] },
  arrowUpRight: { d: ['M7.6 16.4 16.4 7.6', 'M9.4 7.6h7v7'] },
  copy: {
    d: [
      'M9.6 9.4h8.8a1.2 1.2 0 0 1 1.2 1.2v8.8a1.2 1.2 0 0 1-1.2 1.2H9.6a1.2 1.2 0 0 1-1.2-1.2v-8.8a1.2 1.2 0 0 1 1.2-1.2Z',
      'M14.8 9.4V5.8a1.2 1.2 0 0 0-1.2-1.2H5.4a1.2 1.2 0 0 0-1.2 1.2v8.2a1.2 1.2 0 0 0 1.2 1.2h3.6',
    ],
  },
  pencil: { d: ['M16.2 4.6 19.4 7.8 8.6 18.6l-3.9.7.7-3.9Z'] },
  trash: {
    d: [
      'M4.9 7h14.2',
      'M9.4 7V5.3a1.1 1.1 0 0 1 1.1-1.1h3a1.1 1.1 0 0 1 1.1 1.1V7',
      'M6.7 7.2 7.6 18.4a1.2 1.2 0 0 0 1.2 1.1h6.4a1.2 1.2 0 0 0 1.2-1.1l.9-11.2',
    ],
  },
  undo: { d: ['M8.5 8.5 4.5 12.5 8.5 16.5', 'M4.5 12.5h9.4a4.6 4.6 0 0 1 0 9.2H10'] },
  link: {
    d: [
      'M10.4 13.6 13.6 10.4',
      'M11.8 8.2l1.6-1.6a3.9 3.9 0 0 1 5.5 5.5l-1.6 1.6',
      'M12.2 15.8l-1.6 1.6a3.9 3.9 0 0 1-5.5-5.5l1.6-1.6',
    ],
  },
  shield: {
    d: ['M12 3.5 5 6.2v5.3c0 4 2.8 7.6 7 9 4.2-1.4 7-5 7-9V6.2Z', 'M9.4 12.2 11.4 14.2 15 10.4'],
  },
  keyboard: {
    d: [
      'M4.6 6.6h14.8a1.6 1.6 0 0 1 1.6 1.6v7.6a1.6 1.6 0 0 1-1.6 1.6H4.6A1.6 1.6 0 0 1 3 15.8V8.2a1.6 1.6 0 0 1 1.6-1.6Z',
      'M7.6 10.6h.01',
      'M11.4 10.6h.01',
      'M15.2 10.6h.01',
      'M8.6 14.1h6.8',
    ],
  },
  download: { d: ['M12 4v10.4', 'M7.8 10.6 12 14.8l4.2-4.2', 'M5 19h14'] },
  upload: { d: ['M12 15V4.6', 'M7.8 8.8 12 4.6l4.2 4.2', 'M5 19h14'] },
  reset: { d: ['M4.6 10.4A8 8 0 1 0 6.9 5.6', 'M4.6 4.6v5.8h5.8'] },
  info: { circles: [[12, 12, 8.4]], d: ['M12 11v5.6'], dots: [[12, 8.2, 1.05]] },
  alert: { d: ['M12 4.7 2.9 19.4h18.2Z', 'M12 10.2v4.1'], dots: [[12, 17.1, 1.05]] },
  command: {
    d: [
      'M8.5 6.5a2.5 2.5 0 1 0-2.5 2.5h11a2.5 2.5 0 1 0-2.5-2.5v11a2.5 2.5 0 1 0 2.5-2.5h-11a2.5 2.5 0 1 0 2.5 2.5Z',
    ],
  },
  panelLeft: {
    d: [
      'M4.5 5.5h15a1.6 1.6 0 0 1 1.6 1.6v9.8a1.6 1.6 0 0 1-1.6 1.6h-15A1.6 1.6 0 0 1 2.9 16.9V7.1a1.6 1.6 0 0 1 1.6-1.6Z',
      'M9.4 5.5v13.1',
    ],
  },
  globe: {
    circles: [[12, 12, 8.5]],
    d: ['M3.6 12h16.8', 'M12 3.5c2.4 2.5 3.6 5.4 3.6 8.5s-1.2 6-3.6 8.5c-2.4-2.5-3.6-5.4-3.6-8.5S9.6 6 12 3.5Z'],
  },
  enter: { d: ['M19 6v6.4a2.6 2.6 0 0 1-2.6 2.6H5.2', 'M8.4 11.4 4.8 15l3.6 3.6'] },
  arrowUp: { d: ['M12 19.2V5.2', 'M6.4 10.8 12 5.2l5.6 5.6'] },
  arrowDown: { d: ['M12 4.8v14', 'M6.4 13.2 12 18.8l5.6-5.6'] },
  eyeOff: {
    d: [
      'M3.4 3.4 20.6 20.6',
      'M10.6 10.7a2.6 2.6 0 0 0 3.6 3.6',
      'M6.4 6.5C4.6 7.7 3.2 9.6 2.4 12c1.6 4 5.4 6.6 9.6 6.6 1.6 0 3.1-.4 4.4-1',
      'M9.8 5.6c.7-.1 1.5-.2 2.2-.2 4.2 0 8 2.6 9.6 6.6-.4 1.1-1 2.1-1.8 3',
    ],
  },
  sparkle: {
    d: [
      'M11.9 3.6 13.6 8.2 18.2 9.9 13.6 11.6 11.9 16.2 10.2 11.6 5.6 9.9 10.2 8.2Z',
      'M18.4 15.4l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7Z',
    ],
  },
  layers: { d: ['M12 3.6 3.6 8 12 12.4 20.4 8Z', 'M3.6 12.6 12 17l8.4-4.4'] },
  bookmarkPlus: {
    d: [
      'M6.6 4.5h10.8a1 1 0 0 1 1 1v14.1l-6.4-3.6-6.4 3.6V5.5a1 1 0 0 1 1-1Z',
      'M12 7.6v4.8',
      'M9.6 10h4.8',
    ],
  },
  externalLink: {
    d: [
      'M14 4.5h5.5V10',
      'M19.5 4.5 11.6 12.4',
      'M18 14v4.6a1.4 1.4 0 0 1-1.4 1.4H5.4A1.4 1.4 0 0 1 4 18.6V7.4A1.4 1.4 0 0 1 5.4 6H10',
    ],
  },
  refresh: { d: ['M19.4 13.4A8 8 0 1 1 17.1 5.6', 'M19.4 4.6v5.8h-5.8'] },
  chevronRight: { d: ['M9.6 6.6 15 12l-5.4 5.4'] },
  chevronLeft: { d: ['M14.4 6.6 9 12l5.4 5.4'] },
  chevronDown: { d: ['M6.6 9.6 12 15l5.4-5.4'] },
  chevronUp: { d: ['M6.6 14.4 12 9l5.4 5.4'] },
  star: { d: ['M12 4.2l2.4 5 5.4.8-3.9 3.8.9 5.4L12 16.6l-4.8 2.6.9-5.4L4.2 10l5.4-.8Z'] },
  filter: { d: ['M4 6.6h16', 'M7 12h10', 'M10 17.4h4'] },
  history: { circles: [[12, 12, 8.5]], d: ['M12 7.6V12l3 2.4', 'M3.6 6.4v4.2h4.2'] },
} satisfies Record<string, IconSpec>;

export type IconName = keyof typeof ICONS;

export interface IconProps {
  name: IconName;
  /** Rendered square size in pixels; the 24×24 grid is preserved. */
  size?: number;
  class?: string;
  title?: string;
}

export function Icon({ name, size = 18, class: className, title }: IconProps): JSX.Element {
  const spec = ICONS[name] as IconSpec;
  const strokeWidth = spec.filled ? 0.9 : 1.6;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      class={className}
      fill={spec.filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      stroke-width={strokeWidth}
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden={title ? undefined : 'true'}
      role={title ? 'img' : undefined}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {spec.rects?.map(([x, y, w, h, r]) => (
        <rect key={`r${x}-${y}`} x={x} y={y} width={w} height={h} rx={r} />
      ))}
      {spec.circles?.map(([cx, cy, r]) => (
        <circle key={`o${cx}-${cy}`} cx={cx} cy={cy} r={r} />
      ))}
      {spec.d?.map((d) => (
        <path key={d} d={d} />
      ))}
      {spec.dots?.map(([cx, cy, r]) => (
        <circle key={`d${cx}-${cy}`} cx={cx} cy={cy} r={r} fill="currentColor" stroke="none" />
      ))}
    </svg>
  );
}

export const ICON_NAMES = Object.keys(ICONS) as IconName[];
