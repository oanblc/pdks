// Manager.tsx — B4 Müdür inceleme + PIN + B5 Asistlı manuel okutma
import React, { useEffect, useState } from 'react';
import { View, ScrollView, Pressable, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color as C, radius as R, font, shadow } from '../../theme/tokens';
import { Icon } from '../../components/Icon';
import { T, StatusChip, Avatar, Button, TextArea, FieldLabel, styles as S } from '../../components/ui';
import { PopIn } from '../../components/anim';
import { HistoryScreen } from '../HistoryScreen';
import { api, type BranchCampaign, type BranchCampaignEmp } from '../../api';

const fmtKey = (s: string) => { const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? `${m[3]}.${m[2]}.${m[1]}` : s; };

/* ── Ortak sayısal PIN tuş takımı (yalnız rakam, 4-6 hane) ── */
export function NumKeypad({ pin, setPin, onSubmit, busy = false, error = false, accent = C.brand600, statusText = ' ', minLen = 4, maxLen = 6 }: {
  pin: string; setPin: (u: (p: string) => string) => void; onSubmit: () => void;
  busy?: boolean; error?: boolean; accent?: string; statusText?: string; minLen?: number; maxLen?: number;
}) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'ok', '0', 'del'];
  const push = (k: string) => {
    if (k === 'del') setPin(p => p.slice(0, -1));
    else if (k === 'ok') { if (pin.length >= minLen && !busy) onSubmit(); }
    else setPin(p => (p.length < maxLen && !busy ? p + k : p));
  };
  const ready = pin.length >= minLen;
  return (
    <View>
      <View style={{ flexDirection: 'row', gap: 14, justifyContent: 'center', marginTop: 18, marginBottom: 8 }}>
        {[0, 1, 2, 3, 4, 5].map(i => <View key={i} style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: error ? C.errRing : accent, backgroundColor: i < pin.length ? (error ? C.err : accent) : 'transparent' }} />)}
      </View>
      <T v="sm" color={error ? C.err : C.ink3} center style={{ height: 20, marginBottom: 10 }}>{statusText}</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {keys.map((k, i) => (
          <View key={i} style={{ width: '33.33%', padding: 5 }}>
            <Pressable disabled={busy || (k === 'ok' && !ready)} onPress={() => push(k)}
              style={({ pressed }) => [{ height: 56, borderRadius: R.md, alignItems: 'center', justifyContent: 'center', backgroundColor: k === 'ok' ? (ready ? accent : C.surface2) : k === 'del' ? 'transparent' : C.surface2, borderWidth: k === 'del' ? 0 : 1, borderColor: k === 'ok' ? (ready ? accent : C.border) : C.border }, pressed && { opacity: 0.6 }]}>
              {k === 'del' ? <Icon name="backspace" size={24} color={C.ink2} />
                : k === 'ok' ? <Icon name="check" size={24} color={ready ? C.white : C.ink3} />
                  : <T style={{ fontSize: 23, fontFamily: font.medium }}>{k}</T>}
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}

/* ── Yönetici PIN (statik, 4-6 hane) ── */
export function PinPad({ onOk, onClose }: { onOk: () => void; onClose: () => void }) {
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const submit = () => {
    if (pin.length < 4 || busy) return;
    setBusy(true); setError(false);
    api.branchVerifyPin(pin)
      .then(r => { if (r.ok) onOk(); else { setError(true); setPin(''); setBusy(false); } })
      .catch(() => { setError(true); setPin(''); setBusy(false); });
  };
  const setPinClear = (u: (p: string) => string) => { setError(false); setPin(u); };
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(13,20,19,0.55)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22 }}>
      <View style={[{ backgroundColor: C.surface, borderRadius: R.xxl, padding: 30, width: 340 }, shadow.lg]}>
        <Pressable onPress={onClose} hitSlop={8} style={{ position: 'absolute', top: 16, right: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="x" size={20} color={C.ink} />
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: C.brand50, alignItems: 'center', justifyContent: 'center' }}><Icon name="lock" size={26} color={C.brand700} /></View>
          <T v="h3" style={{ marginTop: 10 }}>Yönetici PIN’i</T>
          <T v="sm" color={C.ink3}>İnceleme moduna geçiş · 4-6 hane</T>
        </View>
        <NumKeypad pin={pin} setPin={setPinClear} onSubmit={submit} busy={busy} error={error} statusText={error ? 'PIN hatalı' : busy ? 'Doğrulanıyor…' : ' '} />
      </View>
    </View>
  );
}

/* ── Kiosk'tan çıkış: kiosk PIN'i (rakam tuş takımı) ── */
export function ExitPad({ onOk, onClose }: { onOk: () => void; onClose: () => void }) {
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const submit = () => {
    if (pin.length < 4 || busy) return;
    setBusy(true); setError(false);
    api.branchVerifyPassword(pin)
      .then(r => { if (r.ok) onOk(); else { setError(true); setPin(''); setBusy(false); } })
      .catch(() => { setError(true); setPin(''); setBusy(false); });
  };
  const setPinClear = (u: (p: string) => string) => { setError(false); setPin(u); };
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(13,20,19,0.55)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22 }}>
      <View style={[{ backgroundColor: C.surface, borderRadius: R.xxl, padding: 30, width: 340 }, shadow.lg]}>
        <Pressable onPress={onClose} hitSlop={8} style={{ position: 'absolute', top: 16, right: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="x" size={20} color={C.ink} />
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: C.errBg, alignItems: 'center', justifyContent: 'center' }}><Icon name="logout" size={26} color={C.errInk} /></View>
          <T v="h3" style={{ marginTop: 10 }}>Kiosk’tan çık</T>
          <T v="sm" color={C.ink3} center>Çıkış için kiosk PIN’ini girin · 4-6 hane</T>
        </View>
        <NumKeypad pin={pin} setPin={setPinClear} onSubmit={submit} busy={busy} error={error} accent={C.err} statusText={error ? 'PIN hatalı' : busy ? 'Doğrulanıyor…' : ' '} />
      </View>
    </View>
  );
}

type Arrival = { empId: number; name: string; dept: string | null; in: string | null; out: string | null; status: 'inside' | 'break' | 'outside'; lastPunchId: number; ui: 'pending' | 'approved' | 'disputed'; device: string | null };

/* ── B4: Müdür inceleme (gerçek API) ── */
export function ManagerReview({ branch, onClose, onManual, onExitKiosk }:
  { branch: string; onClose: () => void; onManual: () => void; onExitKiosk: () => void }) {
  const [rows, setRows] = useState<Arrival[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyEmp, setHistoryEmp] = useState<{ id: number; name: string } | null>(null);
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<'arrivals' | 'requests' | 'eval'>('arrivals');
  const [reqs, setReqs] = useState<{ id: number; name: string; dept: string | null; kind: 'leave' | 'fix'; type: string; detail: string | null; leaveStart?: string | null; leaveEnd?: string | null }[]>([]);
  const [reqBusy, setReqBusy] = useState<number | null>(null);
  const [campaigns, setCampaigns] = useState<BranchCampaign[]>([]);
  const [evalTarget, setEvalTarget] = useState<{ campaign: BranchCampaign; emp: BranchCampaignEmp } | null>(null);

  const load = () => api.branchToday().then(d => {
    setRows(d.map(r => ({ empId: r.empId, name: r.name, dept: r.dept, in: r.in, out: r.out, status: r.status, lastPunchId: r.lastPunchId, device: r.device, ui: r.reviewState === 'review' ? 'disputed' : r.reviewState === 'confirmed' ? 'approved' : 'pending' } as Arrival)));
    setLoading(false);
  }).catch(() => setLoading(false));
  const loadReqs = () => api.branchRequests().then(setReqs).catch(() => {});
  const loadCampaigns = () => api.branchEvalCampaigns().then(d => setCampaigns(d.campaigns)).catch(() => {});
  useEffect(() => { load(); loadReqs(); loadCampaigns(); }, []);

  const evalPending = campaigns.reduce((s, c) => s + c.employees.filter(e => !e.done).length, 0);
  const tabs: ['arrivals' | 'requests' | 'eval', string, number][] = [['arrivals', 'Gelenler', rows.length], ['requests', 'Talepler', reqs.length]];
  if (campaigns.length) tabs.push(['eval', 'Performans', evalPending]);

  const decideReq = async (id: number, decision: 'approve' | 'reject') => {
    setReqBusy(id);
    try { await api.branchDecideRequest(id, decision); setReqs(rs => rs.filter(r => r.id !== id)); }
    catch (e: any) { Alert.alert('İşlenemedi', e?.message || 'Tekrar deneyin.'); }
    finally { setReqBusy(null); }
  };

  const review = async (i: number, ui: 'approved' | 'disputed') => {
    const row = rows[i];
    setRows(rs => rs.map((r, j) => (j === i ? { ...r, ui } : r)));
    try { await api.reviewPunch(row.lastPunchId, ui === 'approved' ? 'ok' : 'disputed'); }
    catch (e: any) {
      setRows(rs => rs.map((r, j) => (j === i ? { ...r, ui: 'pending' } : r))); // geri al
      Alert.alert('İşlenemedi', e?.message || 'Kayıt güncellenemedi. Tekrar deneyin.');
    }
  };

  const inside = rows.filter(r => r.status !== 'outside').length;
  const summary: [string, number, 'neu' | 'ok' | 'warn'][] = [
    ['Gelen', rows.length, 'neu'], ['İçeride', inside, 'ok'], ['Çıkan', rows.length - inside, 'warn'],
  ];

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.bg }}>
      <View style={{ paddingTop: 54, paddingHorizontal: 18, paddingBottom: 14, backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
          <Pressable onPress={onClose} hitSlop={6} style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}><Icon name="chevronL" size={22} color={C.ink} /></Pressable>
          <View style={{ flex: 1, minWidth: 0 }}>
            <T v="h2" numberOfLines={1}>Bugün Gelenler</T>
            <T v="sm" color={C.ink3} numberOfLines={1}>{branch} · {rows.length} kayıt</T>
          </View>
        </View>
        <Button variant="ghost" height={44} icon="plus" iconColor={C.ink} label="Manuel" onPress={onManual} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 18 + insets.bottom }}>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          {summary.map(([k, v, t], i) => (
            <View key={i} style={[S.card, { flex: 1, paddingVertical: 14, paddingHorizontal: 12 }]}>
              <T v="h2" tnum color={C[(`${t}Ink`) as 'okInk']}>{v}</T>
              <T v="sm" color={C.ink3}>{k}</T>
            </View>
          ))}
        </View>

        {/* Sekme: Gelenler / Talepler / Performans */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
          {tabs.map(([k, label, n]) => (
            <Pressable key={k} onPress={() => setTab(k)} style={{ flex: 1, height: 42, borderRadius: R.md, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: tab === k ? C.brand600 : C.surface, borderColor: tab === k ? C.brand600 : C.border }}>
              <T v="sm" color={tab === k ? C.white : C.ink2} style={{ fontFamily: font.medium }}>{label}</T>
              {n > 0 && <View style={{ minWidth: 20, height: 20, paddingHorizontal: 6, borderRadius: 10, backgroundColor: tab === k ? 'rgba(255,255,255,0.25)' : C.surface3, alignItems: 'center', justifyContent: 'center' }}><T v="cap" mono color={tab === k ? C.white : C.ink2}>{n}</T></View>}
            </Pressable>
          ))}
        </View>

        {tab === 'requests' ? (
          reqs.length === 0 ? (
            <View style={[S.cardFlat, { padding: 24, alignItems: 'center' }]}>
              <Icon name="inbox" size={30} color={C.ink3} />
              <T v="body" color={C.ink2} center style={{ marginTop: 10 }}>Bekleyen talep yok</T>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {reqs.map(r => {
                const isFix = r.kind === 'fix';
                return (
                  <View key={r.id} style={[S.card, { padding: 14 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Avatar name={r.name} size={40} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <T v="bodyS" style={{ fontSize: 15 }}>{r.name}</T>
                        <T v="cap" color={C.ink3}>{isFix ? 'Düzeltme' : 'İzin'} · {r.type}</T>
                      </View>
                      <StatusChip status={isFix ? 'warn' : 'brand'}>{isFix ? 'Düzeltme' : 'İzin'}</StatusChip>
                    </View>
                    {!isFix && r.leaveStart && r.leaveEnd ? <T v="sm" style={{ marginTop: 8, fontWeight: '700' }}>{r.leaveStart === r.leaveEnd ? fmtKey(r.leaveStart) : `${fmtKey(r.leaveStart)} – ${fmtKey(r.leaveEnd)}`}</T> : null}
                    {r.detail ? <T v="sm" color={C.ink2} style={{ marginTop: r.leaveStart ? 2 : 8 }}>{r.detail}</T> : null}
                    <T v="cap" color={C.ink3} style={{ marginTop: 6 }}>{isFix ? 'Onayınız kesindir.' : 'Görüşünüz İK’ya (admin) iletilir; son kararı İK verir.'}</T>
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                      <Pressable disabled={reqBusy === r.id} onPress={() => decideReq(r.id, 'approve')} style={{ height: 40, paddingHorizontal: 16, borderRadius: R.md, backgroundColor: C.okBg, borderWidth: 1, borderColor: C.okRing, flexDirection: 'row', alignItems: 'center', gap: 6, opacity: reqBusy === r.id ? 0.5 : 1 }}>
                        <Icon name="check" size={17} color={C.okInk} strokeWidth={2.4} /><T v="sm" color={C.okInk}>Onayla</T>
                      </Pressable>
                      <Pressable disabled={reqBusy === r.id} onPress={() => decideReq(r.id, 'reject')} style={{ height: 40, paddingHorizontal: 14, borderRadius: R.md, borderWidth: 1, borderColor: C.errRing, alignItems: 'center', justifyContent: 'center', opacity: reqBusy === r.id ? 0.5 : 1 }}>
                        <T v="sm" color={C.err}>Reddet</T>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          )
        ) : tab === 'eval' ? (
          campaigns.length === 0 ? (
            <View style={[S.cardFlat, { padding: 24, alignItems: 'center' }]}>
              <Icon name="star" size={30} color={C.ink3} />
              <T v="body" color={C.ink2} center style={{ marginTop: 10 }}>Aktif değerlendirme dönemi yok</T>
            </View>
          ) : (
            <View style={{ gap: 18 }}>
              {campaigns.map(c => (
                <View key={c.id} style={{ gap: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <T v="bodyS" style={{ fontSize: 15 }}>{c.name}</T>
                    <T v="cap" color={C.ink3}>son gün {fmtKey(c.endDate)}</T>
                  </View>
                  {c.employees.map(e => (
                    <Pressable key={e.id} onPress={() => setEvalTarget({ campaign: c, emp: e })} style={[S.card, { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
                      <Avatar name={e.name} src={e.avatar || undefined} size={40} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <T v="bodyS" style={{ fontSize: 15 }}>{e.name}</T>
                        <T v="cap" color={C.ink3}>{e.dept || '—'}</T>
                      </View>
                      {e.done ? <StatusChip status="ok">Değerlendirildi</StatusChip> : <StatusChip status="warn">Bekliyor</StatusChip>}
                      <Icon name="chevron" size={18} color={C.ink3} />
                    </Pressable>
                  ))}
                </View>
              ))}
            </View>
          )
        ) : loading ? <T v="body" color={C.ink2}>Yükleniyor…</T>
          : rows.length === 0 ? (
            <View style={[S.cardFlat, { padding: 24, alignItems: 'center' }]}>
              <Icon name="qr" size={30} color={C.ink3} />
              <T v="body" color={C.ink2} center style={{ marginTop: 10 }}>Bugün henüz okutma yok</T>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {rows.map((r, i) => (
                <View key={r.empId} style={[S.card, { padding: 14, backgroundColor: r.ui === 'disputed' ? C.errBg : C.surface, borderColor: r.ui === 'disputed' ? C.errRing : C.border }]}>
                  <Pressable onPress={() => setHistoryEmp({ id: r.empId, name: r.name })} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Avatar name={r.name} size={40} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <T v="bodyS" style={{ fontSize: 15 }}>{r.name}</T>
                      <T v="cap" color={C.ink3}>{r.dept || '—'} · giriş <T v="cap" mono color={C.ink2}>{r.in || '—'}</T>{r.device ? <T v="cap" color={C.ink3}> · {r.device}</T> : null}</T>
                    </View>
                    <StatusChip status={r.status === 'inside' ? 'ok' : r.status === 'break' ? 'warn' : 'neu'}>
                      {r.status === 'inside' ? 'İçeride' : r.status === 'break' ? 'Molada' : `Çıktı ${r.out || ''}`}
                    </StatusChip>
                  </Pressable>

                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                    {r.ui === 'pending' && (
                      <>
                        <Pressable onPress={() => review(i, 'approved')} style={{ height: 40, paddingHorizontal: 16, borderRadius: R.md, backgroundColor: C.okBg, borderWidth: 1, borderColor: C.okRing, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Icon name="check" size={17} color={C.okInk} strokeWidth={2.4} /><T v="sm" color={C.okInk}>Onayla</T>
                        </Pressable>
                        <Pressable onPress={() => review(i, 'disputed')} style={{ height: 40, paddingHorizontal: 14, borderRadius: R.md, borderWidth: 1, borderColor: C.errRing, alignItems: 'center', justifyContent: 'center' }}>
                          <T v="sm" color={C.err}>İtirazlı</T>
                        </Pressable>
                      </>
                    )}
                    {r.ui === 'approved' && <StatusChip status="ok">Onaylandı</StatusChip>}
                    {r.ui === 'disputed' && <StatusChip status="err">İtirazlı kaydedildi</StatusChip>}
                  </View>
                </View>
              ))}
            </View>
          )}

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 14, paddingHorizontal: 4 }}>
          <Icon name="shield" size={16} color={C.ink3} />
          <T v="cap" color={C.ink3} style={{ flex: 1 }}>Tüm onay, itiraz ve manuel işlemler kullanıcı ve zaman damgasıyla denetim kaydına yazılır.</T>
        </View>

        <Button variant="primary" full height={52} label="Kiosk’a dön" onPress={onClose} style={{ marginTop: 18 }} />
        <Button variant="quiet" label="Kiosk modundan çık" onPress={onExitKiosk} style={{ alignSelf: 'center', marginTop: 6 }} />
      </ScrollView>

      {historyEmp && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.surface }}>
          <HistoryScreen employeeId={historyEmp.id} live onBack={() => setHistoryEmp(null)} />
        </View>
      )}

      {evalTarget && (
        <EvalSheet campaign={evalTarget.campaign} emp={evalTarget.emp}
          onClose={() => setEvalTarget(null)}
          onSaved={() => { setEvalTarget(null); loadCampaigns(); }} />
      )}
    </View>
  );
}

/* ── Yıldız seçici (1-5) ── */
function StarPick({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <Pressable key={n} onPress={() => onChange(n === value ? 0 : n)} hitSlop={4}>
          <Icon name="star" size={34} color={n <= value ? C.warn : C.border} fill={n <= value ? C.warn : 'none'} />
        </Pressable>
      ))}
    </View>
  );
}

/* ── Performans değerlendirme formu (kiosk müdürü, birebir) ── */
function EvalSheet({ campaign, emp, onClose, onSaved }:
  { campaign: BranchCampaign; emp: BranchCampaignEmp; onClose: () => void; onSaved: () => void }) {
  const [scores, setScores] = useState<Record<string, number>>({ ...emp.scores });
  const [note, setNote] = useState(emp.note || '');
  const [busy, setBusy] = useState(false);
  const manual = campaign.criteria.filter(c => c.kind === 'manual');
  const allRated = manual.length > 0 && manual.every(c => (scores[c.id] || 0) >= 1);
  const setStar = (id: string, v: number) => setScores(s => { const n = { ...s }; if (v <= 0) delete n[id]; else n[id] = v; return n; });

  const save = async () => {
    if (busy || !allRated) return;
    setBusy(true);
    try { await api.branchSubmitEval(campaign.id, emp.id, scores, note.trim() || undefined); onSaved(); }
    catch (e: any) { Alert.alert('Kaydedilemedi', e?.message || 'Tekrar deneyin.'); setBusy(false); }
  };

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(13,20,19,0.55)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 }}>
      <View style={[{ backgroundColor: C.surface, borderRadius: R.xxl, width: '100%', maxWidth: 520, maxHeight: '90%' }, shadow.lg]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20, borderBottomWidth: 1, borderBottomColor: C.border }}>
          <Avatar name={emp.name} src={emp.avatar || undefined} size={44} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <T v="h3" numberOfLines={1}>{emp.name}</T>
            <T v="sm" color={C.ink3} numberOfLines={1}>{campaign.name} · performans</T>
          </View>
          <Pressable onPress={onClose} hitSlop={8} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}><Icon name="x" size={20} color={C.ink} /></Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
          {manual.map(c => (
            <View key={c.id} style={{ gap: 8 }}>
              <View>
                <T v="bodyS" style={{ fontSize: 15 }}>{c.label}</T>
                {c.hint ? <T v="cap" color={C.ink3} style={{ marginTop: 2 }}>{c.hint}</T> : null}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <StarPick value={scores[c.id] || 0} onChange={v => setStar(c.id, v)} />
                <T v="sm" mono color={C.ink3}>{scores[c.id] ? `${scores[c.id]}/5` : '—'}</T>
              </View>
            </View>
          ))}
          <View>
            <FieldLabel>Not (opsiyonel)</FieldLabel>
            <TextArea placeholder="Güçlü yönler, gelişim alanları…" value={note} onChangeText={setNote} />
          </View>
          <View style={{ flexDirection: 'row', gap: 10, padding: 12, borderRadius: R.md, backgroundColor: C.brand50, borderWidth: 1, borderColor: C.brand100 }}>
            <Icon name="info" size={19} color={C.brand700} />
            <T v="sm" color={C.brand700} style={{ flex: 1 }}>Puanlar İK paneline taslak olarak iletilir; yayınlamayı İK yapar.</T>
          </View>
          <Button variant="primary" full height={54} label={busy ? 'Gönderiliyor…' : allRated ? 'Değerlendirmeyi gönder' : 'Tüm kriterleri puanlayın'} onPress={allRated && !busy ? save : undefined} style={allRated && !busy ? undefined : { opacity: 0.45 }} />
        </ScrollView>
      </View>
    </View>
  );
}

/* ── B5: Asistlı manuel okutma ── */
export function ManualPunch({ onClose }: { onClose: () => void }) {
  const [sel, setSel] = useState<number | null>(null);
  const [dir, setDir] = useState<'enter' | 'exit'>('enter');
  const [reason, setReason] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [people, setPeople] = useState<{ id: number; name: string; dept: string | null }[]>([]);
  useEffect(() => { api.branchEmployees().then(setPeople).catch(() => {}); }, []);

  const canSave = sel !== null && reason.trim().length > 0;
  const save = async () => {
    if (sel === null || !canSave || busy) return;
    setBusy(true);
    try {
      await api.branchManualPunch(sel, dir, reason.trim());
      setDone(true);
    } catch (e: any) { Alert.alert('Kaydedilemedi', e?.message || 'Manuel okutma kaydedilemedi. Tekrar deneyin.'); } finally { setBusy(false); }
  };

  if (done) {
    return (
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(13,20,19,0.55)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22 }}>
        <PopIn style={[{ backgroundColor: C.surface, borderRadius: R.xxl, paddingVertical: 40, paddingHorizontal: 40, alignItems: 'center', minWidth: 320 }, shadow.lg]}>
          <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: C.ok, alignItems: 'center', justifyContent: 'center', borderWidth: 10, borderColor: C.okBg }}><Icon name="check" size={44} color={C.white} strokeWidth={2.8} /></View>
          <T v="h2" style={{ marginTop: 20 }}>Manuel okutma kaydedildi</T>
          <StatusChip status="warn" style={{ marginTop: 12 }}>manuel-asistlı · denetime işlendi</StatusChip>
          <Button variant="primary" height={50} label="Tamam" onPress={onClose} style={{ marginTop: 24, minWidth: 200 }} />
        </PopIn>
      </View>
    );
  }

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(13,20,19,0.55)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 }}>
      <View style={[{ backgroundColor: C.surface, borderRadius: R.xxl, width: '100%', maxWidth: 480, maxHeight: '88%' }, shadow.lg]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: C.border }}>
          <View style={{ flex: 1 }}>
            <T v="h3">Asistlı manuel okutma</T>
            <T v="sm" color={C.ink3} style={{ marginTop: 2 }}>Telefonu olmayan / şarjı biten çalışan için</T>
          </View>
          <Pressable onPress={onClose} hitSlop={8} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}><Icon name="x" size={20} color={C.ink} /></Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 18 }}>
          <View>
            <FieldLabel>Çalışan seçin</FieldLabel>
            <View style={[S.card, { overflow: 'hidden' }]}>
              {people.length === 0 ? (
                <View style={{ paddingVertical: 16, paddingHorizontal: 14 }}><T v="body" color={C.ink3}>Yükleniyor…</T></View>
              ) : people.map((p, idx) => (
                <Pressable key={p.id} onPress={() => setSel(p.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 11, paddingHorizontal: 14, borderTopWidth: idx ? 1 : 0, borderTopColor: C.border, backgroundColor: sel === p.id ? C.brand50 : C.surface }}>
                  <Avatar name={p.name} size={34} />
                  <T v="body" style={{ flex: 1 }}>{p.name}{p.dept ? ` · ${p.dept}` : ''}</T>
                  {sel === p.id && <Icon name="check" size={18} color={C.brand600} strokeWidth={2.4} />}
                </Pressable>
              ))}
            </View>
          </View>
          <View>
            <FieldLabel>İşlem</FieldLabel>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {([['enter', 'Giriş'], ['exit', 'Çıkış']] as const).map(([k, l]) => (
                <Pressable key={k} onPress={() => setDir(k)} style={{ flex: 1, height: 48, borderRadius: R.md, alignItems: 'center', justifyContent: 'center', backgroundColor: dir === k ? C.brand600 : C.surface2, borderWidth: 1, borderColor: dir === k ? C.brand600 : C.border }}>
                  <T color={dir === k ? C.white : C.ink2} style={{ fontSize: 15 }}>{l}</T>
                </Pressable>
              ))}
            </View>
          </View>
          <View>
            <FieldLabel>Gerekçe (zorunlu)</FieldLabel>
            <TextArea placeholder="Örn. çalışanın telefonu şarj bitti…" value={reason} onChangeText={setReason} />
          </View>
          <View style={{ flexDirection: 'row', gap: 10, padding: 12, borderRadius: R.md, backgroundColor: C.warnBg, borderWidth: 1, borderColor: C.warnRing }}>
            <Icon name="info" size={19} color={C.warnInk} />
            <T v="sm" color={C.warnInk} style={{ flex: 1 }}>Bu okutma, denetim kaydına “manuel-asistlı” etiketiyle, sizin kimliğinizle işlenir.</T>
          </View>
          <Button variant="primary" full height={54} label={busy ? 'Kaydediliyor…' : 'Okutmayı kaydet'} onPress={canSave && !busy ? save : undefined} style={canSave && !busy ? undefined : { opacity: 0.45 }} />
        </ScrollView>
      </View>
    </View>
  );
}
