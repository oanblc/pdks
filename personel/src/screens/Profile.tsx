// Profile.tsx — A8 Profil/Ayarlar + A9 Bildirimler + push banner
import React, { useState, useEffect } from 'react';
import { View, ScrollView, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color as C, radius as R, Tone, font } from '../theme/tokens';
import { Icon, IconName } from '../components/Icon';
import { T, RoundButton, StatusChip, Avatar, SectionLabel, MenuRow, Button, TextField, styles as S } from '../components/ui';
import { FadeUp, PopIn } from '../components/anim';
import { KvkkSheet } from '../components/KvkkSheet';
import { DataRequestSheet } from './DataRequest';
import { EMPLOYEE } from '../data';
import { api } from '../api';

function relTime(iso: string) {
  const m = Math.floor((Date.now() - Date.parse(iso)) / 60000);
  if (m < 1) return 'az önce'; if (m < 60) return `${m} dk önce`;
  const h = Math.floor(m / 60); if (h < 24) return `${h} sa önce`;
  return `${Math.floor(h / 24)} gün önce`;
}

const toneBg: Record<string, { bg: string; ink: string }> = {
  ok: { bg: C.okBg, ink: C.okInk }, warn: { bg: C.warnBg, ink: C.warnInk },
  neu: { bg: C.neuBg, ink: C.neuInk }, err: { bg: C.errBg, ink: C.errInk },
};

export function ProfileScreen({ employee = EMPLOYEE, onClose, onLogout }: { employee?: typeof EMPLOYEE; onClose: () => void; onLogout: () => void }) {
  const insets = useSafeAreaInsets();
  const [kvkk, setKvkk] = useState(false);
  const [dataReq, setDataReq] = useState(false);
  const [pwd, setPwd] = useState(false);
  const [showKiosk, setShowKiosk] = useState(false);
  const fmtDate = (s?: string | null) => {
    if (!s) return '—';
    const d = new Date(s);
    return isNaN(+d) ? '—' : `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
  };
  const work: [IconName, string, string][] = [
    ['building', 'Şube', employee.branch], ['user', 'Departman', employee.dept],
    ['clock', 'Vardiya', employee.shift], ['calendar', 'İşe başlangıç', fmtDate(employee.startDate)],
  ];
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingHorizontal: 16, paddingBottom: 8 }}>
        <RoundButton icon="chevronL" onPress={onClose} bg={C.surface} />
        <T v="h3">Profil</T>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 + insets.bottom, paddingTop: 8 }}>
        <View style={[S.card, { padding: 24, alignItems: 'center' }]}>
          <Avatar name={employee.name} size={84} ring />
          <T v="h2" style={{ marginTop: 14 }}>{employee.name}</T>
          <T v="sm" color={C.ink2} style={{ marginTop: 3 }}>{employee.role}</T>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
            <StatusChip status="brand">{employee.branch}</StatusChip>
            <T v="cap" mono color={C.ink3}>SİCİL {employee.id}</T>
          </View>
        </View>

        <SectionLabel style={{ paddingTop: 20 }}>ÇALIŞMA BİLGİLERİ</SectionLabel>
        <View style={[S.card, { overflow: 'hidden' }]}>
          {work.map(([ic, k, v], i) => (
            <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 16, paddingVertical: 15, borderTopWidth: i ? 1 : 0, borderTopColor: C.border }}>
              <View style={{ width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface2 }}><Icon name={ic} size={19} color={C.ink2} /></View>
              <T v="body" color={C.ink2} style={{ flex: 1 }}>{k}</T>
              <T v="bodyS" style={{ fontFamily: font.medium }}>{v}</T>
            </View>
          ))}
        </View>
        <T v="cap" color={C.ink3} style={{ paddingHorizontal: 6, paddingTop: 8 }}>Bu bilgiler İK tarafından yönetilir. Değişiklik için müdürünüze başvurun.</T>

        {employee.isManager && (
          <>
            <SectionLabel style={{ paddingTop: 20 }}>KIOSK KODU</SectionLabel>
            <View style={[S.card, { overflow: 'hidden' }]}>
              <MenuRow icon="lock" title="Günlük kiosk kodu" detail="Her gün yenilenir · şube yetkilisi" onPress={() => setShowKiosk(true)} />
            </View>
          </>
        )}

        <SectionLabel style={{ paddingTop: 20 }}>GÜVENLİK</SectionLabel>
        <View style={[S.card, { overflow: 'hidden' }]}>
          <MenuRow icon="lock" title="Şifremi değiştir" onPress={() => setPwd(true)} />
        </View>

        <SectionLabel style={{ paddingTop: 20 }}>KVKK & VERİLERİM</SectionLabel>
        <View style={[S.card, { overflow: 'hidden' }]}>
          <MenuRow icon="doc" title="KVKK aydınlatma metni" detail="v2.1 · 14.04.2026" onPress={() => setKvkk(true)} />
          <MenuRow icon="shield" title="Verilerime erişim talebi" detail="Erişim · düzeltme · silme" topBorder onPress={() => setDataReq(true)} />
        </View>

        <Button variant="ghost" full height={54} icon="logout" iconColor={C.err} label="Oturumu kapat" onPress={onLogout}
          style={{ marginTop: 22, backgroundColor: C.errBg, borderColor: C.errRing }} />
        <T v="cap" color={C.ink3} center style={{ marginTop: 16 }}>Çalışan PDKS · sürüm 1.0.0</T>
      </ScrollView>

      {kvkk && <KvkkSheet onClose={() => setKvkk(false)} />}
      {dataReq && <DataRequestSheet onClose={() => setDataReq(false)} />}
      {pwd && <ChangePasswordSheet onClose={() => setPwd(false)} />}
      {showKiosk && <KioskCodeSheet code={employee.kioskCode} onClose={() => setShowKiosk(false)} />}
    </View>
  );
}

function KioskCodeSheet({ code, onClose }: { code: string | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingHorizontal: 16, paddingBottom: 8, gap: 12 }}>
        <RoundButton icon="chevronL" onPress={onClose} bg={C.surface} />
        <T v="h3">Kiosk Kodu</T>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 + insets.bottom }}>
        <View style={[S.card, { padding: 28, alignItems: 'center' }]}>
          <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: C.brand50, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="lock" size={26} color={C.brand700} />
          </View>
          <T v="cap" color={C.ink3} style={{ marginTop: 16 }}>BUGÜNÜN KODU</T>
          <T mono tnum style={{ fontSize: 48, lineHeight: 58, letterSpacing: 10, marginTop: 8, color: C.ink, textAlign: 'center' }}>{code || '——'}</T>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
            <Icon name="clock" size={14} color={C.ink3} />
            <T v="cap" color={C.ink3}>Her gün otomatik yenilenir</T>
          </View>
        </View>
        <View style={[S.cardFlat, { padding: 16, marginTop: 14, flexDirection: 'row', gap: 12, alignItems: 'flex-start' }]}>
          <Icon name="info" size={18} color={C.ink3} />
          <T v="sm" color={C.ink2} style={{ flex: 1, lineHeight: 20 }}>Kiosk tabletinde yönetici işlemlerine (inceleme, manuel okutma, kiosktan çıkış) geçerken bu kodu PIN olarak girin. Kod yalnız sizde ve şubenizin diğer yetkililerinde görünür.</T>
        </View>
      </ScrollView>
    </View>
  );
}

function ChangePasswordSheet({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const valid = next.length >= 4 && current.length >= 4 && next === confirm;

  const submit = async () => {
    setErr(null);
    if (current.length < 1) { setErr('Mevcut şifrenizi girin.'); return; }
    if (next.length < 8) { setErr('Yeni şifre en az 8 karakter olmalı.'); return; }
    if (next !== confirm) { setErr('Yeni şifreler eşleşmiyor.'); return; }
    setBusy(true);
    try {
      await api.changePassword(current, next);
      setDone(true);
    } catch {
      setErr('Mevcut şifre hatalı');
    } finally { setBusy(false); }
  };

  if (done) {
    return (
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 }}>
        <PopIn style={{ width: 104, height: 104, borderRadius: 52, backgroundColor: C.ok, alignItems: 'center', justifyContent: 'center', borderWidth: 12, borderColor: C.okBg }}>
          <Icon name="check" size={52} color={C.white} strokeWidth={2.8} />
        </PopIn>
        <FadeUp delay={60}><T v="h1" center style={{ marginTop: 26 }}>Şifreniz güncellendi</T></FadeUp>
        <FadeUp delay={120}>
          <T v="body" color={C.ink2} center style={{ marginTop: 10, maxWidth: 290 }}>
            Yeni şifrenizle giriş yapabilirsiniz. Güvenliğiniz için şifrenizi kimseyle paylaşmayın.
          </T>
        </FadeUp>
        <FadeUp delay={180} style={{ width: '100%' }}>
          <Button variant="primary" full height={56} label="Geri dön" onPress={onClose} style={{ marginTop: 34 }} />
        </FadeUp>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.surface }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ paddingTop: 56, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: C.border, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <RoundButton icon="chevronL" onPress={onClose} />
        <View>
          <T v="h3">Şifremi değiştir</T>
          <T v="cap" color={C.ink3}>Hesap güvenliği</T>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
        <T v="body" color={C.ink2}>Hesabınızı güvende tutmak için güçlü bir şifre seçin. Yeni şifreniz en az 8 karakter olmalıdır.</T>

        <TextField label="Mevcut şifre" value={current} onChangeText={t => { setCurrent(t); setErr(null); }} placeholder="••••" secure />
        <TextField label="Yeni şifre" value={next} onChangeText={t => { setNext(t); setErr(null); }} placeholder="En az 8 karakter" secure />
        <TextField label="Yeni şifre (tekrar)" value={confirm} onChangeText={t => { setConfirm(t); setErr(null); }} placeholder="Tekrar girin" secure />

        {err && (
          <View style={{ flexDirection: 'row', gap: 10, padding: 13, borderRadius: R.md, backgroundColor: C.errBg, borderWidth: 1, borderColor: C.errRing, alignItems: 'center' }}>
            <Icon name="info" size={19} color={C.err} />
            <T v="sm" color={C.err} style={{ flex: 1 }}>{err}</T>
          </View>
        )}
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16 + insets.bottom, borderTopWidth: 1, borderTopColor: C.border }}>
        <Button variant="primary" full height={56} label={busy ? 'Güncelleniyor…' : 'Şifreyi güncelle'} onPress={valid && !busy ? submit : undefined} style={valid && !busy ? undefined : { opacity: 0.45 }} />
      </View>
    </KeyboardAvoidingView>
  );
}

export function NotificationsScreen({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<{ icon: string; tone: string; title: string; body: string; time: string }[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.notifications().then(n => { setItems(n); setLoading(false); }).catch(() => setLoading(false)); }, []);
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingHorizontal: 16, paddingBottom: 8 }}>
        <RoundButton icon="chevronL" onPress={onClose} bg={C.surface} />
        <T v="h3">Bildirimler</T>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, paddingTop: 8 }}>
        {loading ? <T v="body" color={C.ink2}>Yükleniyor…</T>
          : items.length === 0 ? (
            <View style={[S.cardFlat, { padding: 24, alignItems: 'center' }]}>
              <Icon name="bell" size={30} color={C.ink3} />
              <T v="body" color={C.ink2} style={{ marginTop: 10 }}>Bildiriminiz yok</T>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {items.map((n, i) => {
                const tb = toneBg[n.tone] || toneBg.neu;
                return (
                  <View key={i} style={[S.card, { padding: 15, flexDirection: 'row', gap: 13, alignItems: 'flex-start' }]}>
                    <View style={{ width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: tb.bg }}><Icon name={n.icon as IconName} size={19} color={tb.ink} /></View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <T v="bodyS" style={{ fontSize: 15, flex: 1 }} numberOfLines={1}>{n.title}</T>
                        <T v="cap" color={C.ink3}>{relTime(n.time)}</T>
                      </View>
                      <T v="sm" color={C.ink2} style={{ marginTop: 3, fontFamily: font.regular }}>{n.body}</T>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
      </ScrollView>
    </View>
  );
}

export function PushBanner({ title, body, tone = 'warn', icon = 'bell', onPress }:
  { title: string; body: string; tone?: string; icon?: IconName; onPress?: () => void }) {
  const tb = toneBg[tone] || toneBg.warn;
  return (
    <FadeUp delay={0} distance={-12} style={{ position: 'absolute', top: 52, left: 12, right: 12 }}>
      <Pressable onPress={onPress} style={[{ backgroundColor: 'rgba(255,255,255,0.96)', borderRadius: 20, borderWidth: 1, borderColor: C.border, padding: 14, flexDirection: 'row', gap: 12, alignItems: 'flex-start' }, S.card, shadowLg]}>
        <View style={{ width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: tb.bg }}><Icon name={icon} size={20} color={tb.ink} /></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <T v="bodyS" style={{ fontSize: 15 }}>Çalışan PDKS</T>
            <T v="cap" color={C.ink3}>şimdi</T>
          </View>
          <T v="sm" style={{ fontFamily: font.semibold, marginTop: 2 }}>{title}</T>
          <T v="sm" color={C.ink2} style={{ fontFamily: font.regular, marginTop: 1 }}>{body}</T>
        </View>
      </Pressable>
    </FadeUp>
  );
}

const shadowLg = { shadowColor: '#102826', shadowOpacity: 0.12, shadowRadius: 28, shadowOffset: { width: 0, height: 12 }, elevation: 10 };
