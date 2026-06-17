// tokens.ts — Çalışan PDKS tasarım sistemi (design-system.css'ten RN'e port)
// Temiz & nötr SaaS · derin teal · açık tema · WCAG AA
import { Platform, TextStyle, ViewStyle } from 'react-native';

export const color = {
  // — Marka (mavi vurgu — web ile aynı) —
  brand50: '#EAF0FE',
  brand100: '#E0EBFB',
  brand200: '#D7E3FC',
  brand300: '#9FC0F0',
  brand500: '#2B5CE6',
  brand600: '#2B5CE6', // PRIMARY
  brand700: '#2049C9',
  brand800: '#18379A',
  brand: '#2B5CE6',
  brandBg: '#EAF0FE',
  brandInk: '#2049C9',
  brandRing: '#D7E3FC',

  // — Nötr (soğuk gri-mavi) —
  bg: '#F1F4F9',
  surface: '#ffffff',
  surface2: '#F7F9FC',
  surface3: '#FAFBFD',
  border: '#E7ECF4',
  borderStrong: '#E0E6F0',
  ink: '#0F1B2D',
  ink2: '#3d4d66',
  ink3: '#5A6B85',

  // — Durum semantiği (web ile aynı) —
  ok: '#15A06B', okBg: '#E7F4EE', okInk: '#15805A', okRing: '#CDEADD',
  warn: '#B5780C', warnBg: '#FFF8EC', warnInk: '#7A5510', warnRing: '#F2E2BF',
  neu: '#8294ad', neuBg: '#EEF2F8', neuInk: '#5A6B85', neuRing: '#DDE4EE',
  err: '#E0533A', errBg: '#FBECE9', errInk: '#C13A22', errRing: '#F3CFC7',

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
    ios: { shadowColor: '#2B5CE6', shadowOpacity: 0.32, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
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
