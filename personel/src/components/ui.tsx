// ui.tsx — paylaşılan UI atomları (design-system.css'ten port)
import React, { useEffect, useState } from 'react';
import {
  Text, View, Pressable, StyleSheet, TextStyle, ViewStyle, StyleProp, Image, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color as C, type as TY, font, radius as R, shadow, toneSet, Tone } from '../theme/tokens';
import { Icon, IconName } from './Icon';

/* ── Metin ── */
type Variant = keyof typeof TY;
export function T({
  v = 'body', color, mono, tnum, center, style, numberOfLines, children,
}: {
  v?: Variant; color?: string; mono?: boolean; tnum?: boolean; center?: boolean;
  style?: StyleProp<TextStyle>; numberOfLines?: number; children?: React.ReactNode;
}) {
  const monoFamily = ['counter', 'h1', 'h2', 'h3', 'bodyS'].includes(v) ? font.monoMedium : font.mono;
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        TY[v],
        mono && { fontFamily: monoFamily },
        (tnum || mono) && ({ fontVariant: ['tabular-nums'] } as TextStyle),
        color ? { color } : null,
        center && { textAlign: 'center' },
        style,
      ]}>
      {children}
    </Text>
  );
}

/* ── Basılabilir sarmalayıcı (scale .975/.98) ── */
export function Press({
  onPress, style, scaleTo = 0.975, children, disabled,
}: {
  onPress?: () => void; style?: StyleProp<ViewStyle>; scaleTo?: number;
  children?: React.ReactNode; disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      style={({ pressed }) => [style, pressed && !disabled ? { transform: [{ scale: scaleTo }] } : null, disabled && { opacity: 0.45 }]}>
      {children}
    </Pressable>
  );
}

/* ── Butonlar ── */
export function Button({
  label, icon, variant = 'primary', onPress, full, height, style, iconColor,
}: {
  label: string; icon?: IconName; variant?: 'primary' | 'ghost' | 'quiet';
  onPress?: () => void; full?: boolean; height?: number; style?: StyleProp<ViewStyle>; iconColor?: string;
}) {
  const map = {
    primary: { bg: C.brand600, fg: C.white, border: 'transparent', h: 52, sh: shadow.sm },
    ghost: { bg: C.surface2, fg: C.ink, border: C.border, h: 52, sh: undefined },
    quiet: { bg: 'transparent', fg: C.brand700, border: 'transparent', h: 44, sh: undefined },
  }[variant];
  return (
    <Press onPress={onPress} scaleTo={0.975}
      style={[
        styles.btnBase,
        { height: height ?? map.h, backgroundColor: map.bg, borderWidth: map.border === 'transparent' ? 0 : 1, borderColor: map.border },
        map.sh, full && { width: '100%' }, style,
      ]}>
      {icon && <Icon name={icon} size={20} color={iconColor ?? map.fg} />}
      <Text style={[styles.btnLabel, { color: map.fg, fontSize: variant === 'quiet' ? 15 : 16 }]}>{label}</Text>
    </Press>
  );
}

// Dev eylem butonu (80px) — 3 saniye kuralı
export function ActionButton({
  label, icon, kind, onPress,
}: { label: string; icon?: IconName; kind: 'enter' | 'exit' | 'warn'; onPress?: () => void }) {
  const bg = kind === 'enter' ? C.brand600 : kind === 'exit' ? C.ink : C.warn;
  const sh = kind === 'enter' ? shadow.brand : shadow.md;
  return (
    <Press onPress={onPress} scaleTo={0.98}
      style={[{ width: '100%', height: 64, borderRadius: R.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 11, backgroundColor: bg }, sh]}>
      {icon && <Icon name={icon} size={23} color={C.white} />}
      <Text style={{ fontFamily: font.semibold, fontSize: 18, letterSpacing: -0.3, color: C.white }}>{label}</Text>
    </Press>
  );
}

export function BreakButton({ label, icon, onPress }: { label: string; icon?: IconName; onPress?: () => void }) {
  return (
    <Press onPress={onPress} scaleTo={0.98}
      style={{ width: '100%', height: 56, borderRadius: R.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1, borderColor: C.warnRing, backgroundColor: C.warnBg }}>
      {icon && <Icon name={icon} size={20} color={C.warnInk} />}
      <Text style={{ fontFamily: font.semibold, fontSize: 16, color: C.warnInk }}>{label}</Text>
    </Press>
  );
}

// Yuvarlak ikon buton (üst bar / geri)
export function RoundButton({ icon, onPress, size = 40, bg = C.surface2, iconColor = C.ink, iconSize = 20, style }:
  { icon: IconName; onPress?: () => void; size?: number; bg?: string; iconColor?: string; iconSize?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <Press onPress={onPress} scaleTo={0.92}
      style={[{ width: size, height: size, borderRadius: R.full, backgroundColor: bg, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Icon name={icon} size={iconSize} color={iconColor} />
    </Press>
  );
}

/* ── Durum çipi ── */
export function StatusChip({ status = 'neu', children, style }: { status?: Tone; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = toneSet[status];
  return (
    <View style={[styles.chip, { backgroundColor: t.bg }, style]}>
      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: t.dot }} />
      <Text style={{ fontFamily: font.semibold, fontSize: 12.5, color: t.ink }}>{children}</Text>
    </View>
  );
}

/* ── Avatar ── */
export function Avatar({ name = '', size = 44, src, ring = false }: { name?: string; size?: number; src?: string; ring?: boolean }) {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const inner = (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.brand100, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      {src ? <Image source={{ uri: src }} style={{ width: '100%', height: '100%' }} />
        : <Text style={{ fontFamily: font.semibold, fontSize: size * 0.38, color: C.brand700 }}>{initials}</Text>}
    </View>
  );
  if (!ring) return inner;
  return (
    <View style={{ padding: 2, borderRadius: (size + 8) / 2, backgroundColor: C.brand200 }}>
      <View style={{ padding: 2, borderRadius: (size + 4) / 2, backgroundColor: C.surface }}>{inner}</View>
    </View>
  );
}

/* ── Üst bar ── */
export function TopBar({ title, subtitle, onBack, right }:
  { title: string; subtitle?: string; onBack?: () => void; right?: React.ReactNode }) {
  return (
    <View style={{ paddingTop: 54, backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 6, paddingBottom: 13, minHeight: 50, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          {onBack && <RoundButton icon="chevronL" onPress={onBack} />}
          <View style={{ flex: 1, minWidth: 0 }}>
            <T v="h2" numberOfLines={1}>{title}</T>
            {subtitle && <T v="cap" color={C.ink3} style={{ marginTop: 2 }}>{subtitle}</T>}
          </View>
        </View>
        {right}
      </View>
    </View>
  );
}

/* ── Alt tab bar ── */
export function TabBar({ active, onChange }: { active: string; onChange: (id: string) => void }) {
  const insets = useSafeAreaInsets();
  const tabs: { id: string; label: string; icon: IconName }[] = [
    { id: 'home', label: 'Ana sayfa', icon: 'home' },
    { id: 'requests', label: 'Talepler', icon: 'inbox' },
  ];
  return (
    <View style={{ flexDirection: 'row', backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 7, paddingHorizontal: 8, paddingBottom: Math.max(12, insets.bottom) }}>
      {tabs.map(t => {
        const on = active === t.id;
        return (
          <Pressable key={t.id} onPress={() => onChange(t.id)} style={{ flex: 1, alignItems: 'center', gap: 4, paddingTop: 6, paddingBottom: 2 }}>
            <Icon name={t.icon} size={25} color={on ? C.brand600 : C.ink3} strokeWidth={on ? 2 : 1.75} />
            <Text style={{ fontFamily: font.semibold, fontSize: 11, color: on ? C.brand600 : C.ink3 }}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ── Bölüm etiketi ── */
export function SectionLabel({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[TY.monoLabel, { color: C.ink3, paddingHorizontal: 4, paddingBottom: 9, textTransform: 'uppercase' }, style]}>{children}</Text>;
}

/* ── Anahtar/değer satırı ── */
export function KV({ label, value, valueColor, mono, border }: { label: string; value: string; valueColor?: string; mono?: boolean; border?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, borderTopWidth: border ? 1 : 0, borderTopColor: C.border }}>
      <T v="body" color={C.ink2}>{label}</T>
      <T v="bodyS" mono={mono} tnum color={valueColor}>{value}</T>
    </View>
  );
}

/* ── Menü/ayar satırı ── */
export function MenuRow({ icon, title, detail, onPress, chevron = true, danger = false, topBorder = false }:
  { icon?: IconName; title: string; detail?: string; onPress?: () => void; chevron?: boolean; danger?: boolean; topBorder?: boolean }) {
  return (
    <Press onPress={onPress} scaleTo={1}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 16, paddingVertical: 15, backgroundColor: C.surface, borderTopWidth: topBorder ? 1 : 0, borderTopColor: C.border }}>
      {icon && (
        <View style={{ width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: danger ? C.errBg : C.brand50 }}>
          <Icon name={icon} size={20} color={danger ? C.err : C.brand700} />
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontFamily: font.medium, fontSize: 16, color: danger ? C.err : C.ink }}>{title}</Text>
        {detail && <T v="cap" color={C.ink3} style={{ marginTop: 1 }}>{detail}</T>}
      </View>
      {chevron && <Icon name="chevron" size={18} color={C.ink3} />}
    </Press>
  );
}

/* ── İlerleme noktaları (onboarding) ── */
export function Dots({ total, index }: { total: number; index: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={{ height: 6, borderRadius: 3, width: i === index ? 22 : 6, backgroundColor: i === index ? C.brand600 : C.borderStrong }} />
      ))}
    </View>
  );
}

/* ── Toggle ── */
export function Toggle({ on, onPress }: { on: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ width: 50, height: 30, borderRadius: R.full, backgroundColor: on ? C.brand600 : C.borderStrong, justifyContent: 'center' }}>
      <View style={[{ position: 'absolute', top: 3, left: on ? 23 : 3, width: 24, height: 24, borderRadius: 12, backgroundColor: C.white }, shadow.sm]} />
    </Pressable>
  );
}

/* ── Görünüm kutusu (input görünümlü, salt-görüntü) ── */
export function InputBox({ children, style }: { children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ height: 52, borderRadius: R.md, borderWidth: 1.5, borderColor: C.borderStrong, backgroundColor: C.surface, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, style]}>
      {children}
    </View>
  );
}

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Text style={{ fontFamily: font.semibold, fontSize: 13, color: C.ink2, marginBottom: 7 }}>{children}</Text>;
}

export function TextArea({ placeholder, value, onChangeText }: { placeholder?: string; value?: string; onChangeText?: (s: string) => void }) {
  return (
    <TextInput
      placeholder={placeholder} placeholderTextColor={C.ink3} value={value} onChangeText={onChangeText}
      multiline textAlignVertical="top"
      style={{ height: 84, borderRadius: R.md, borderWidth: 1.5, borderColor: C.borderStrong, backgroundColor: C.surface, padding: 13, fontFamily: font.regular, fontSize: 16, color: C.ink }} />
  );
}

/* ── Yazılabilir alan (odak vurgulu) ── */
export function TextField({
  label, value, onChangeText, placeholder, keyboardType, maxLength, secure, rightSlot, autoFocus, mono,
}: {
  label?: string; value?: string; onChangeText?: (s: string) => void; placeholder?: string;
  keyboardType?: 'default' | 'number-pad' | 'phone-pad' | 'email-address';
  maxLength?: number; secure?: boolean; rightSlot?: React.ReactNode; autoFocus?: boolean; mono?: boolean;
}) {
  const [focus, setFocus] = useState(false);
  return (
    <View>
      {label && <FieldLabel>{label}</FieldLabel>}
      <View style={{ height: 52, borderRadius: R.md, borderWidth: 1.5, borderColor: focus ? C.brand500 : C.borderStrong, backgroundColor: C.surface, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <TextInput
          style={{ flex: 1, fontFamily: mono ? font.mono : font.regular, fontSize: 16, color: C.ink, padding: 0 }}
          placeholder={placeholder} placeholderTextColor={C.ink3}
          value={value} onChangeText={onChangeText} keyboardType={keyboardType} maxLength={maxLength}
          secureTextEntry={secure} autoFocus={autoFocus} autoCapitalize="none" autoCorrect={false}
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} />
        {rightSlot}
      </View>
    </View>
  );
}

/* ── canlı süre sayacı ── */
export function useTicker(startMs: number | null, running = true): string {
  const [, force] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => force(n => n + 1), 1000);
    return () => clearInterval(id);
  }, [running]);
  if (!startMs) return '00:00';
  const s = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

export const styles = StyleSheet.create({
  card: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: R.lg },
  cardFlat: { backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border, borderRadius: R.lg },
  btnBase: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: R.md, paddingHorizontal: 22 },
  btnLabel: { fontFamily: font.semibold, letterSpacing: -0.16 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 26, paddingHorizontal: 10, borderRadius: R.full, alignSelf: 'flex-start' },
});
