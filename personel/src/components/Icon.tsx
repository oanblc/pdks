// Icon.tsx — tutarlı çizgi ikon seti (stroke 1.75, currentColor) — react-native-svg
import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { color as C } from '../theme/tokens';

export const ICON_PATHS = {
  home: 'M3 10.5 12 3l9 7.5M5.5 9v11h13V9',
  history: 'M3.5 5.5h17M3.5 10.5h17M3.5 15.5h17M7 3v18M3.5 4.5h17v15h-17z',
  calendar: 'M7 3v3M17 3v3M3.5 8.5h17M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v12A1.5 1.5 0 0 1 19 20.5H5A1.5 1.5 0 0 1 3.5 19V7A1.5 1.5 0 0 1 5 5.5Z',
  inbox: 'M3.5 13.5 6 6.5a2 2 0 0 1 1.9-1.3h8.2A2 2 0 0 1 18 6.5l2.5 7M3.5 13.5V18a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-4.5M3.5 13.5H8l1.5 2.5h5L16 13.5h4.5',
  qr: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2.5v2.5H14zM19.5 14H20v2.5M14 19.5h2.5V20M19.5 17.5H20v2',
  camera: 'M4.5 8.5h3l1.6-2.2h5.8L16.5 8.5h3a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18V10a1.5 1.5 0 0 1 1.5-1.5Z',
  coffee: 'M5 9h11v5a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V9ZM16 10h2.2a2.2 2.2 0 0 1 0 4.4H16M8 3.5c-.6.8-.6 1.7 0 2.5M11.5 3.5c-.6.8-.6 1.7 0 2.5',
  check: 'M4.5 12.5 9.5 17.5 19.5 6.5',
  clock: 'M12 7v5l3.5 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z',
  chevron: 'M9 5l7 7-7 7',
  chevronL: 'M15 5l-7 7 7 7',
  chevronDown: 'M5 9l7 7 7-7',
  plus: 'M12 5v14M5 12h14',
  bell: 'M18 8.5a6 6 0 1 0-12 0c0 6-2.5 7.5-2.5 7.5h17S18 14.5 18 8.5ZM10 20a2.2 2.2 0 0 0 4 0',
  user: 'M12 12.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM5 20c.7-3.5 3.6-5.5 7-5.5s6.3 2 7 5.5',
  settings: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM19.4 13a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1v.3a2 2 0 1 1-4 0v-.2A1.6 1.6 0 0 0 7 18.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H2.8a2 2 0 1 1 0-4H3a1.6 1.6 0 0 0 1.5-1.1l.0-.1A1.6 1.6 0 0 0 4.1 5l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H11a1.6 1.6 0 0 0 1-1.5V.8',
  lock: 'M7 10.5V8a5 5 0 0 1 10 0v2.5M5.5 10.5h13a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19v-7a1.5 1.5 0 0 1 1.5-1.5Z',
  shield: 'M12 3 5 6v5.5c0 4.5 3 7.7 7 9.5 4-1.8 7-5 7-9.5V6l-7-3Z',
  logout: 'M9 4.5H6a1.5 1.5 0 0 0-1.5 1.5v12A1.5 1.5 0 0 0 6 19.5h3M15 8l4 4-4 4M9.5 12H19',
  arrowL: 'M11 5l-7 7 7 7M4 12h16',
  x: 'M6 6l12 12M18 6 6 18',
  refresh: 'M20 8.5a8 8 0 1 0 1.2 6M20 4v5h-5',
  wifiOff: 'M3 3l18 18M8.5 14.5a5 5 0 0 1 5.4-.9M5 11a10 10 0 0 1 4-2.3M2 8.5a14 14 0 0 1 4.5-2.7M19 8.5a14 14 0 0 0-5-2.8M21.5 11.5q-.8-.9-1.8-1.6M12 19h.01',
  phone: 'M8 3.5h8a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5H8A1.5 1.5 0 0 1 6.5 19V5A1.5 1.5 0 0 1 8 3.5ZM10.5 17.5h3',
  faceid: 'M5 8V6.5A1.5 1.5 0 0 1 6.5 5H8M16 5h1.5A1.5 1.5 0 0 1 19 6.5V8M19 16v1.5a1.5 1.5 0 0 1-1.5 1.5H16M8 19H6.5A1.5 1.5 0 0 1 5 17.5V16M9 9.5v1.5M15 9.5v1.5M12 9.5v3l-1 .8M9 15c.9.8 1.9 1.2 3 1.2s2.1-.4 3-1.2',
  message: 'M4 5.5h16a1 1 0 0 1 1 1V16a1 1 0 0 1-1 1H9l-4 3.5V17H4a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1Z',
  doc: 'M7 3.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 19V5A1.5 1.5 0 0 1 7 3.5ZM14 3.5V8h4M8.5 12.5h7M8.5 16h5',
  plane: 'M21 4 3 11l6 2.5M21 4l-3 15-6-5.5M21 4 9 13.5M9 13.5V19l3-2.7',
  sun: 'M12 5.5V3M12 21v-2.5M5.5 12H3M21 12h-2.5M6.8 6.8 5 5M19 19l-1.8-1.8M6.8 17.2 5 19M19 5l-1.8 1.8M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z',
  alert: 'M12 8.5v5M12 16.5h.01M10.3 4l-7 12A2 2 0 0 0 5 19h14a2 2 0 0 0 1.7-3l-7-12a2 2 0 0 0-3.4 0Z',
  info: 'M12 11v5M12 7.5h.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z',
  pin: 'M12 21s7-5.3 7-11a7 7 0 1 0-14 0c0 5.7 7 11 7 11ZM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  building: 'M5 21V5a1.5 1.5 0 0 1 1.5-1.5h7A1.5 1.5 0 0 1 15 5v16M15 21V10h3.5A1.5 1.5 0 0 1 20 11.5V21M3.5 21h17M8 7h4M8 10.5h4M8 14h4',
  swap: 'M7 4 3.5 7.5 7 11M3.5 7.5H17M17 20l3.5-3.5L17 13M20.5 16.5H7',
  edit: 'M16.5 4.5 19.5 7.5 9 18l-4 1 1-4 10.5-10.5ZM14.5 6.5l3 3',
  backspace: 'M21 6H9.2a1.5 1.5 0 0 0-1.1.5L3 12l5.1 5.5a1.5 1.5 0 0 0 1.1.5H21a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 21 6ZM17.5 9.5l-4.5 5M13 9.5l4.5 5',
  grid: 'M4 4.5h6v6H4zM14 4.5h6v6h-6zM4 14.5h6v6H4zM14 14.5h6v6h-6z',
} as const;

export type IconName = keyof typeof ICON_PATHS;

export function Icon({
  name,
  size = 24,
  color = 'currentColor',
  strokeWidth = 1.75,
  fill = 'none',
}: {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  fill?: string;
}) {
  const d = ICON_PATHS[name];
  if (!d) return null;
  // 'currentColor' RN'de yok — ink'e düş
  const stroke = color === 'currentColor' ? C.ink : color;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={fill}>
      <Path d={d} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
