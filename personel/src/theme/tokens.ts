// tokens.ts — Çalışan PDKS tasarım sistemi (design-system.css'ten RN'e port)
// Temiz & nötr SaaS · derin teal · açık tema · WCAG AA
import { Platform, TextStyle, ViewStyle } from 'react-native';

export const color = {
  // — Marka (derin teal) —
  brand50: '#e8f2f2',
  brand100: '#c8e2e2',
  brand200: '#97c8c8',
  brand300: '#5fa9a9',
  brand500: '#138181',
  brand600: '#0e6b6b', // PRIMARY
  brand700: '#0b5555',
  brand800: '#083f3f',
  brand: '#0e6b6b',
  brandBg: '#e8f2f2',
  brandInk: '#0b5555',
  brandRing: '#c8e2e2',

  // — Nötr (soğuk, çok düşük doygunluk) —
  bg: '#eef1f1',
  surface: '#ffffff',
  surface2: '#f6f8f8',
  surface3: '#eef2f2',
  border: '#e4e9e9',
  borderStrong: '#d2dada',
  ink: '#15201f',
  ink2: '#51605d',
  ink3: '#899593',

  // — Durum semantiği (HER YÜZEYDE AYNI) —
  ok: '#1f8a5b', okBg: '#e6f4ec', okInk: '#155e3e', okRing: '#b6e0c9',
  warn: '#b3730c', warnBg: '#faf0db', warnInk: '#75490a', warnRing: '#ecd29a',
  neu: '#6b7775', neuBg: '#eef1f1', neuInk: '#434c4b', neuRing: '#d8dede',
  err: '#c5372b', errBg: '#fbeae8', errInk: '#8d251c', errRing: '#eebcb6',

  white: '#ffffff',
  black: '#000000',
} as const;

// Durum semantiği yardımcı eşlemesi (chip/badge için)
export type Tone = 'ok' | 'warn' | 'neu' | 'err' | 'brand';
export const toneSet: Record<Tone, { bg: string; ink: string; dot: string; ring: string }> = {
  ok: { bg: color.okBg, ink: color.okInk, dot: color.ok, ring: color.okRing },
  warn: { bg: color.warnBg, ink: color.warnInk, dot: color.warn, ring: color.warnRing },
  neu: { bg: color.neuBg, ink: color.neuInk, dot: color.neu, ring: color.neuRing },
  err: { bg: color.errBg, ink: color.errInk, dot: color.err, ring: color.errRing },
  brand: { bg: color.brand50, ink: color.brand700, dot: color.brand600, ring: color.brand100 },
};

export const radius = {
  xs: 8, sm: 11, md: 14, lg: 20, xl: 26, xxl: 34, full: 999,
} as const;

// Fontlar: Geist (sans) + Geist Mono. RN custom fontlarda ağırlık sentezlenmez,
// bu yüzden her ağırlık ayrı bir fontFamily'dir.
export const font = {
  regular: 'Geist_400Regular',
  medium: 'Geist_500Medium',
  semibold: 'Geist_600SemiBold',
  bold: 'Geist_700Bold',
  mono: 'GeistMono_400Regular',
  monoMedium: 'GeistMono_500Medium',
} as const;

// Gölgeler (yumuşak, sakin) — iOS shadow + Android elevation
export const shadow = {
  sm: Platform.select({
    ios: { shadowColor: '#102826', shadowOpacity: 0.06, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
    android: { elevation: 1 },
    default: {},
  }) as ViewStyle,
  md: Platform.select({
    ios: { shadowColor: '#102826', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
    android: { elevation: 4 },
    default: {},
  }) as ViewStyle,
  lg: Platform.select({
    ios: { shadowColor: '#102826', shadowOpacity: 0.12, shadowRadius: 28, shadowOffset: { width: 0, height: 12 } },
    android: { elevation: 10 },
    default: {},
  }) as ViewStyle,
  brand: Platform.select({
    ios: { shadowColor: '#0e6b6b', shadowOpacity: 0.28, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
    android: { elevation: 6 },
    default: {},
  }) as ViewStyle,
} as const;

// Tipografi ölçeği (design-system.css'ten; letterSpacing px'e çevrildi)
export const type: Record<string, TextStyle> = {
  counter: { fontFamily: font.bold, fontSize: 60, lineHeight: 60, letterSpacing: -1.8, color: color.ink },
  h1: { fontFamily: font.bold, fontSize: 28, lineHeight: 32, letterSpacing: -0.56, color: color.ink },
  h2: { fontFamily: font.semibold, fontSize: 22, lineHeight: 26, letterSpacing: -0.44, color: color.ink },
  h3: { fontFamily: font.semibold, fontSize: 18, lineHeight: 23, letterSpacing: -0.27, color: color.ink },
  body: { fontFamily: font.regular, fontSize: 16, lineHeight: 24, color: color.ink },
  bodyS: { fontFamily: font.semibold, fontSize: 16, lineHeight: 23, color: color.ink },
  sm: { fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: color.ink },
  cap: { fontFamily: font.medium, fontSize: 13, lineHeight: 18, color: color.ink },
  monoLabel: { fontFamily: font.monoMedium, fontSize: 11.5, letterSpacing: 0.92, color: color.ink },
};

export const ease = 'cubic-bezier(.22,.61,.36,1)';
