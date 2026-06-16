// RequestsScreen.tsx — A7 Talepler (gerçek API: kendi talepleri + gönderme)
import React, { useEffect, useState } from 'react';
import { View, ScrollView, Pressable, Alert } from 'react-native';
import { color as C, radius as R, Tone } from '../theme/tokens';
import { Icon, IconName } from '../components/Icon';
import { T, TopBar, StatusChip, Button, RoundButton, SectionLabel, FieldLabel, TextField, TextArea, styles as S } from '../components/ui';
import { FadeUp, PopIn } from '../components/anim';
import { api } from '../api';

type Req = { id: number; kind: string; type: string; detail?: string; status: string; createdAt: string };
const stMap: Record<string, [Tone, string]> = { pending: ['warn', 'Bekliyor'], approved: ['ok', 'Onaylandı'], rejected: ['err', 'Reddedildi'] };

function rel(iso: string) {
  const m = Math.floor((Date.now() - Date.parse(iso)) / 60000);
  if (m < 1) return 'az önce'; if (m < 60) return `${m} dk önce`;
  const h = Math.floor(m / 60); if (h < 24) return `${h} saat önce`;
  return `${Math.floor(h / 24)} gün önce`;
}

export function RequestsScreen() {
  const [wizard, setWizard] = useState(false);
  const [reqs, setReqs] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => api.myRequests().then(r => { setReqs(r); setLoading(false); }).catch(() => setLoading(false));
  useEffect(() => { load(); }, []);

  return (
    <View style={{ flex: 1 }}>
      <TopBar title="Talepler" subtitle="İzin ve düzeltme talepleriniz" />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 16 }}>
        {loading ? <T v="body" color={C.ink2}>Yükleniyor…</T>
          : reqs.length === 0 ? (
            <View style={[S.cardFlat, { padding: 24, alignItems: 'center' }]}>
              <Icon name="inbox" size={32} color={C.ink3} />
              <T v="body" color={C.ink2} center style={{ marginTop: 10 }}>Henüz talebiniz yok</T>
              <T v="cap" color={C.ink3} center style={{ marginTop: 2 }}>Aşağıdan yeni talep oluşturabilirsiniz</T>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {reqs.map(r => {
                const icon: IconName = r.kind === 'fix' ? 'edit' : 'calendar';
                const st = stMap[r.status] ?? ['neu', r.status];
                return (
                  <View key={r.id} style={[S.card, { padding: 15, flexDirection: 'row', alignItems: 'center', gap: 13 }]}>
                    <View style={{ width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: C.brand50 }}>
                      <Icon name={icon} size={21} color={C.brand700} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <T v="bodyS">{r.type}</T>
                      {r.detail ? <T v="cap" color={C.ink3} style={{ marginTop: 2 }}>{r.detail}</T> : null}
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                      <StatusChip status={st[0]}>{st[1]}</StatusChip>
                      <T v="cap" color={C.ink3}>{rel(r.createdAt)}</T>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
      </ScrollView>

      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 26, backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.border }}>
        <Button variant="primary" full height={56} icon="plus" iconColor={C.white} label="Yeni talep" onPress={() => setWizard(true)} />
      </View>

      {wizard && <NewRequestWizard onClose={() => { setWizard(false); setLoading(true); load(); }} />}
    </View>
  );
}

function Pill({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ height: 42, paddingHorizontal: 16, borderRadius: R.full, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? C.brand600 : C.surface2, borderWidth: 1, borderColor: active ? C.brand600 : C.border }}>
      <T v="sm" color={active ? C.white : C.ink2}>{label}</T>
    </Pressable>
  );
}

function NewRequestWizard({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [type, setType] = useState<null | 'leave' | 'fix'>(null);
  const [leaveKind, setLeaveKind] = useState('Yıllık izin');
  const [missing, setMissing] = useState('Çıkış');
  const [busy, setBusy] = useState(false);
  // Yıllık izin bakiyesi (görünürlük) — talep verirken kalanı göster
  const [leaveBal, setLeaveBal] = useState<{ entitlement: number; used: number; pending: number; remaining: number } | null>(null);
  useEffect(() => { api.me().then(r => setLeaveBal(r.leave)).catch(() => {}); }, []);
  // leave fields
  const [start, setStart] = useState('18.06.2026');
  const [end, setEnd] = useState('20.06.2026');
  const [note, setNote] = useState('');
  // fix fields
  const [day, setDay] = useState('03.06.2026');
  const [time, setTime] = useState('18:05');
  const [gerekce, setGerekce] = useState('');
  const back = () => { if (step === 0) onClose(); else setStep(s => s - 1); };

  const fixReady = gerekce.trim().length > 0;

  const send = async () => {
    if (type === 'fix' && !fixReady) return;
    let body: { kind: 'leave' | 'fix'; type: string; detail: string; leaveStart?: string; leaveEnd?: string };
    if (type === 'leave') {
      const toKey = (s: string) => {
        const m = s.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
        if (!m) return null;
        const d = +m[1], mo = +m[2], y = +m[3];
        // takvimsel geçerlilik: 31.02 / 31.13 gibi tarihler reddedilsin
        const dt = new Date(y, mo - 1, d);
        if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
        return `${m[3]}-${m[2]}-${m[1]}`;
      };
      const ls = toKey(start), le = toKey(end);
      if (!ls || !le) { Alert.alert('Geçersiz tarih', 'Geçerli bir tarihi GG.AA.YYYY biçiminde girin.'); return; }
      if (le < ls) { Alert.alert('Geçersiz aralık', 'Bitiş tarihi başlangıçtan önce olamaz.'); return; }
      body = { kind: 'leave', type: leaveKind, detail: `${start} – ${end}` + (note.trim() ? ` · ${note.trim()}` : ''), leaveStart: ls, leaveEnd: le };
    } else {
      body = { kind: 'fix', type: 'Eksik okutma düzeltme', detail: `${day} · ${missing} ${time}` + (gerekce.trim() ? ` · ${gerekce.trim()}` : '') };
    }
    setBusy(true);
    try {
      await api.request(body);
      setStep(2);
    } catch (e: any) { Alert.alert('Gönderilemedi', e?.message || 'Talep gönderilirken bir hata oluştu. Tekrar deneyin.'); } finally { setBusy(false); }
  };

  const sendDisabled = busy || (type === 'fix' && !fixReady);

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.surface }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: C.border }}>
        <RoundButton icon={step === 0 ? 'x' : 'chevronL'} onPress={back} />
        <T v="h3">{step === 2 ? '' : 'Yeni Talep'}</T>
        <View style={{ width: 40 }} />
      </View>

      {step === 0 && (
        <View style={{ padding: 20 }}>
          <SectionLabel>NE TALEP EDİYORSUNUZ?</SectionLabel>
          <View style={{ gap: 12 }}>
            <Pressable onPress={() => { setType('leave'); setStep(1); }} style={[S.card, { padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 }]}>
              <View style={{ width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: C.brand50 }}><Icon name="calendar" size={24} color={C.brand700} /></View>
              <View style={{ flex: 1 }}><T v="bodyS">İzin talebi</T><T v="cap" color={C.ink3} style={{ marginTop: 2 }}>Yıllık · mazeret · hastalık</T></View>
              <Icon name="chevron" size={18} color={C.ink3} />
            </Pressable>
            <Pressable onPress={() => { setType('fix'); setStep(1); }} style={[S.card, { padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 }]}>
              <View style={{ width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: C.warnBg }}><Icon name="edit" size={22} color={C.warnInk} /></View>
              <View style={{ flex: 1 }}><T v="bodyS">Eksik okutma düzeltme</T><T v="cap" color={C.ink3} style={{ marginTop: 2 }}>Unutulan giriş/çıkış kaydı</T></View>
              <Icon name="chevron" size={18} color={C.ink3} />
            </Pressable>
          </View>
        </View>
      )}

      {step === 1 && (
        <View style={{ flex: 1, justifyContent: 'space-between', padding: 20 }}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={{ gap: 18 }}>
              {type === 'leave' ? (
                <>
                  <View>
                    <FieldLabel>İzin türü</FieldLabel>
                    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                      {['Yıllık izin', 'Mazeret', 'Hastalık'].map(k => <Pill key={k} active={leaveKind === k} label={k} onPress={() => setLeaveKind(k)} />)}
                    </View>
                  </View>
                  {leaveKind === 'Yıllık izin' && leaveBal && (
                    <View style={[S.card, { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.brand50, borderColor: C.brand50 }]}>
                      <Icon name="calendar" size={20} color={C.brand700} />
                      <View style={{ flex: 1 }}>
                        <T v="bodyS" color={C.brand700}>Yıllık izin bakiyeniz: {leaveBal.remaining} / {leaveBal.entitlement} gün</T>
                        <T v="cap" color={C.ink3} style={{ marginTop: 2 }}>{leaveBal.used} gün kullanıldı{leaveBal.pending > 0 ? ` · ${leaveBal.pending} gün onay bekliyor` : ''}</T>
                      </View>
                    </View>
                  )}
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ flex: 1 }}><TextField label="Başlangıç" value={start} onChangeText={setStart} placeholder="GG.AA.YYYY" mono /></View>
                    <View style={{ flex: 1 }}><TextField label="Bitiş" value={end} onChangeText={setEnd} placeholder="GG.AA.YYYY" mono /></View>
                  </View>
                  <View><FieldLabel>Açıklama (opsiyonel)</FieldLabel><TextArea placeholder="Kısa not…" value={note} onChangeText={setNote} /></View>
                </>
              ) : (
                <>
                  <View><FieldLabel>Gün</FieldLabel><TextField value={day} onChangeText={setDay} placeholder="GG.AA.YYYY" mono /></View>
                  <View>
                    <FieldLabel>Hangi kayıt eksik?</FieldLabel>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {['Giriş', 'Çıkış'].map(k => (
                        <Pressable key={k} onPress={() => setMissing(k)} style={{ flex: 1, height: 46, borderRadius: R.md, alignItems: 'center', justifyContent: 'center', backgroundColor: missing === k ? C.brand600 : C.surface2, borderWidth: 1, borderColor: missing === k ? C.brand600 : C.border }}>
                          <T color={missing === k ? C.white : C.ink2} style={{ fontSize: 15 }}>{k}</T>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                  <View><FieldLabel>Doğru saat</FieldLabel><TextField value={time} onChangeText={setTime} placeholder="SS:DD" mono /></View>
                  <View><FieldLabel>Gerekçe (zorunlu)</FieldLabel><TextArea placeholder="Çıkış okutmayı unuttum…" value={gerekce} onChangeText={setGerekce} /></View>
                </>
              )}
            </View>
          </ScrollView>
          <Button variant="primary" full height={56} label={busy ? 'Gönderiliyor…' : 'Talebi gönder'} onPress={sendDisabled ? undefined : send} style={{ marginTop: 16, opacity: sendDisabled ? 0.6 : 1 }} />
        </View>
      )}

      {step === 2 && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 26 }}>
          <PopIn style={{ width: 104, height: 104, borderRadius: 52, backgroundColor: C.ok, alignItems: 'center', justifyContent: 'center', borderWidth: 12, borderColor: C.okBg }}>
            <Icon name="check" size={52} color={C.white} strokeWidth={2.8} />
          </PopIn>
          <FadeUp delay={60}><T v="h2" center style={{ marginTop: 26 }}>Talebiniz gönderildi</T></FadeUp>
          <FadeUp delay={120}><T v="body" color={C.ink2} center style={{ marginTop: 8, maxWidth: 270 }}>Müdür onayına iletildi. Sonuç bildirim olarak gelecek.</T></FadeUp>
          <StatusChip status="warn" style={{ marginTop: 18 }}>Onay bekliyor</StatusChip>
          <FadeUp delay={180} style={{ width: '100%' }}><Button variant="primary" full height={54} label="Tamam" onPress={onClose} style={{ marginTop: 32 }} /></FadeUp>
        </View>
      )}
    </View>
  );
}
