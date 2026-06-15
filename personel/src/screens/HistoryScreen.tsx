// HistoryScreen.tsx — A6 Geçmiş / Puantaj (kioskta gerçek API; önizlemede mock)
import React, { useEffect, useState } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color as C, Tone } from '../theme/tokens';
import { Icon } from '../components/Icon';
import { T, TopBar, RoundButton, StatusChip, KV, Button, styles as S } from '../components/ui';
import { api } from '../api';

type DayInfo = { st: keyof typeof ST; in?: string | null; out?: string | null; brk?: string; net?: string; diff?: string; label?: string };
const ST = {
  full: { c: C.ok, bg: C.okBg, ink: C.okInk, tr: 'Tam gün', tone: 'ok' as Tone },
  missing: { c: C.warn, bg: C.warnBg, ink: C.warnInk, tr: 'Eksik basma', tone: 'warn' as Tone },
  short: { c: C.warn, bg: C.warnBg, ink: C.warnInk, tr: 'Kısa gün', tone: 'warn' as Tone },
  over: { c: C.brand600, bg: C.brand50, ink: C.brand700, tr: 'Fazla mesai', tone: 'brand' as Tone },
  leave: { c: C.neu, bg: C.neuBg, ink: C.neuInk, tr: 'İzinli', tone: 'neu' as Tone },
  absent: { c: C.err, bg: C.errBg, ink: C.errInk, tr: 'Devamsız', tone: 'err' as Tone },
};
const WD = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const hhmm = (m: number) => `${Math.floor(Math.abs(m) / 60)}:${String(Math.abs(m) % 60).padStart(2, '0')}`;

function DayDetailSheet({ day, data, monthLabel, weekday, onClose }: { day: number; data: Record<number, DayInfo>; monthLabel: string; weekday: string; onClose: () => void }) {
  const d = data[day];
  const meta = d ? ST[d.st] : null;
  return (
    <Pressable onPress={onClose} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(21,32,31,0.35)', justifyContent: 'flex-end' }}>
      <Pressable onPress={() => {}} style={{ backgroundColor: C.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 }}>
        <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: C.borderStrong, alignSelf: 'center', marginBottom: 16 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <T v="cap" color={C.ink3}>{monthLabel}</T>
            <T v="h2">{day} · {weekday}</T>
          </View>
          {meta && <StatusChip status={meta.tone}>{meta.tr}</StatusChip>}
        </View>
        {d ? (
          <View style={{ marginTop: 10 }}>
            <KV label="Giriş" value={d.in || '—'} mono />
            <KV label="Çıkış" value={d.out || 'Okutulmadı'} valueColor={d.out ? undefined : C.warnInk} mono border />
            <KV label="Mola toplam" value={d.brk || '—'} mono border />
            <KV label="Net süre" value={d.net || '—'} mono border />
            <KV label="Fazla / eksik" value={d.diff || '—'} valueColor={(d.diff || '').startsWith('+') ? C.okInk : C.warnInk} mono border />
          </View>
        ) : (
          <View style={[S.cardFlat, { padding: 18, marginTop: 18, alignItems: 'center' }]}><T v="body" color={C.ink2}>Bu gün için kayıt yok</T></View>
        )}
      </Pressable>
    </Pressable>
  );
}

export function HistoryScreen({ onBack, employeeId }: { onBack?: () => void; employeeId?: number; live?: boolean } = {}) {
  const insets = useSafeAreaInsets();
  const [sel, setSel] = useState<number | null>(null);
  const [monthOffset, setMonthOffset] = useState(0); // 0 = bu ay, negatif = geçmiş
  const [data, setData] = useState<Record<number, DayInfo>>({});
  const [summary, setSummary] = useState<[string, string][]>([['Net', '—'], ['Fazla', '—'], ['Gün', '—'], ['Eksik', '—']]);

  // seçili ayı (offset'e göre) hesapla
  const now = new Date();
  const viewDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const y = viewDate.getFullYear(), mo = viewDate.getMonth();
  const isCurrentMonth = monthOffset === 0;
  const today = now.getDate();
  const daysInMonth = new Date(y, mo + 1, 0).getDate();
  const firstDow = (new Date(y, mo, 1).getDay() + 6) % 7;
  const monthLabel = `${AYLAR[mo]} ${y}`;
  const monthKey = `${y}-${String(mo + 1).padStart(2, '0')}`;
  const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  useEffect(() => {
    if (!employeeId) return;
    let cancelled = false;
    api.branchEmployeeTimesheet(employeeId, monthKey).then(r => {
      if (cancelled) return;
      const dd: Record<number, DayInfo> = {};
      // backend durumları: full | over | missing | short | leave — bilinmeyen durum sessizce "tam gün" olmasın
      const known: Record<string, keyof typeof ST> = { full: 'full', over: 'over', missing: 'missing', short: 'short', leave: 'leave', absent: 'absent' };
      for (const d of r.days) {
        const st: keyof typeof ST = d.status === 'leave' ? 'leave' : d.flagged ? 'missing' : (known[d.status] ?? 'missing');
        dd[d.day] = { st, in: d.in, out: d.out, brk: hhmm(d.breakMin), net: d.status === 'leave' ? 'İzinli' : d.netMin > 0 ? hhmm(d.netMin) : '—', diff: d.status === 'leave' ? '—' : d.status === 'missing' ? 'Çıkış yok' : (d.diffMin >= 0 ? '+' : '-') + hhmm(d.diffMin) };
      }
      setData(dd);
      setSummary([['Net', hhmm(r.summary.netMin)], ['Fazla', '+' + hhmm(r.summary.overtimeMin)], ['Gün', String(r.summary.present)], ['Eksik', String(r.summary.missing)]]);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [employeeId, monthKey]);

  const monthNav = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <RoundButton icon="chevronL" onPress={() => { setSel(null); setMonthOffset(o => o - 1); }} />
      <RoundButton icon="chevron" onPress={isCurrentMonth ? undefined : () => { setSel(null); setMonthOffset(o => Math.min(0, o + 1)); }} style={isCurrentMonth ? { opacity: 0.4 } : undefined} />
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <TopBar title="Puantaj" subtitle={monthLabel} onBack={onBack} right={monthNav} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 16 + insets.bottom }}>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 18 }}>
          {summary.map(([k, v], i) => (
            <View key={i} style={[S.cardFlat, { flex: 1, paddingVertical: 12, paddingHorizontal: 6, alignItems: 'center' }]}>
              <T v="bodyS" mono tnum color={i === 1 ? C.okInk : C.ink} style={{ fontSize: 15 }} numberOfLines={1}>{v}</T>
              <T v="cap" color={C.ink3} center style={{ marginTop: 3, fontSize: 11.5 }}>{k}</T>
            </View>
          ))}
        </View>

        <View style={[S.card, { padding: 14 }]}>
          <View style={{ flexDirection: 'row', marginBottom: 8 }}>
            {WD.map((w, i) => <T key={i} v="monoLabel" color={C.ink3} center style={{ flex: 1, fontSize: 10.5, textTransform: 'uppercase' }}>{w}</T>)}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {cells.map((day, i) => {
              if (!day) return <View key={i} style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 2.5 }} />;
              const dow = (firstDow + day - 1) % 7;
              const isWeekend = dow >= 5;
              const isToday = isCurrentMonth && day === today;
              const isFuture = isCurrentMonth && day > today;
              const d = data[day];
              const meta = d ? ST[d.st] : null;
              return (
                <View key={i} style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 2.5 }}>
                  <Pressable disabled={isFuture} onPress={() => !isFuture && setSel(day)}
                    style={{ flex: 1, borderRadius: 11, borderWidth: isToday ? 2 : 1, borderColor: isToday ? C.brand600 : 'transparent', backgroundColor: meta ? meta.bg : (isWeekend ? 'transparent' : C.surface2), opacity: isFuture ? 0.4 : 1, alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                    <T tnum style={{ fontSize: 14, color: meta ? meta.ink : (isWeekend ? C.ink3 : C.ink) }}>{day}</T>
                    {meta && <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: meta.c }} />}
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 16, paddingHorizontal: 2 }}>
          {Object.entries(ST).map(([k, v]) => (
            <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: 16, marginBottom: 10 }}>
              <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: v.c }} />
              <T v="cap" color={C.ink2}>{v.tr}</T>
            </View>
          ))}
        </View>
      </ScrollView>

      {sel !== null && <DayDetailSheet day={sel} data={data} monthLabel={monthLabel} weekday={WD[(new Date(y, mo, sel).getDay() + 6) % 7]} onClose={() => setSel(null)} />}
    </View>
  );
}
