// BranchLogin.tsx — B6 Şube kurulum: şube KONUMDAN otomatik algılanır + geofence (50 m)
import React, { useEffect, useState } from 'react';
import { View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { color as C, radius as R, shadow } from '../../theme/tokens';
import { Icon, IconName } from '../../components/Icon';
import { T, Button, TextField, StatusChip, RoundButton, styles as S } from '../../components/ui';
import { Spinner } from '../../components/anim';
import { distanceMeters, getBranchCenter, setBranchCenter, GEOFENCE_RADIUS_M, LatLng } from '../../lib/geo';
import { api, setToken } from '../../api';

type Issue = null | { kind: 'blocked'; d: number } | { kind: 'denied' } | { kind: 'error' } | { kind: 'cred' } | { kind: 'revoked' };

const DEVICE_CODE = 'TBL-0294'; // bu tabletin cihaz kodu (gerçekte cihaz keystore'undan)

// Prototip: konuma göre şube belirleme. Gerçekte cihaz konumu, yönetici panelindeki
// şube koordinatlarıyla eşleştirilir; burada demo şubeyi döndürüyoruz.
function detectBranchName(_here: LatLng): string {
  return 'Merkez Şube';
}

export function BranchLogin({ onStart, onBack }: { onStart: (branch: string, branchId?: number, deviceCode?: string) => void; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const [pw, setPw] = useState('');
  const [detecting, setDetecting] = useState(true);
  const [branch, setBranch] = useState<string | null>(null);
  const [detectErr, setDetectErr] = useState<null | 'denied' | 'error'>(null);
  const [checking, setChecking] = useState(false);
  const [issue, setIssue] = useState<Issue>(null);

  const detect = async () => {
    setDetecting(true); setDetectErr(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setDetectErr('denied'); return; }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setBranchCenter(here);                 // tableti bu konuma (şubeye) eşle
      setBranch(detectBranchName(here));
    } catch {
      setDetectErr('error');
    } finally {
      setDetecting(false);
    }
  };
  useEffect(() => { detect(); }, []);

  const finishLogin = async (here?: LatLng) => {
    try {
      const r = await api.branchLogin('merkez-sube', pw, DEVICE_CODE);   // tek şube demo: kullanıcı adı sabit
      setToken(r.token);
      // İlk kurulum: şubenin paneldeki konumu boşsa, tabletin GPS'ini şube merkezi olarak kaydet.
      if (here && r.branch.lat == null) { try { await api.branchSetLocation(here.lat, here.lng); } catch {} }
      onStart(r.branch.name, r.branch.id, r.device?.code ?? DEVICE_CODE);
    } catch (e: any) {
      const msg = String(e?.message || '');
      setIssue({ kind: msg.includes('iptal') ? 'revoked' : 'cred' });
    }
  };

  const handleStart = async () => {
    if (!branch) return;
    setChecking(true); setIssue(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setIssue({ kind: 'denied' }); return; }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      const center = getBranchCenter();
      if (!center) { setBranchCenter(here); await finishLogin(here); return; }
      const d = distanceMeters(here, center);
      if (d <= GEOFENCE_RADIUS_M) await finishLogin(here);
      else setIssue({ kind: 'blocked', d: Math.round(d) });
    } catch {
      setIssue({ kind: 'error' });
    } finally {
      setChecking(false);
    }
  };

  const issueCard = issue && (() => {
    const map: Record<string, { icon: IconName; title: string; body: string }> = {
      blocked: { icon: 'pin', title: 'Şube konumunda değilsiniz', body: `Kiosk yalnızca şube konumunda (${GEOFENCE_RADIUS_M} m) açılır. Şu an ~${(issue as any).d} m uzaktasınız.` },
      denied: { icon: 'alert', title: 'Konum izni gerekli', body: 'Kiosk konum doğrulaması için cihaz konum iznini verin.' },
      error: { icon: 'alert', title: 'Konum alınamadı', body: 'Konum servisinin açık olduğundan emin olup tekrar deneyin.' },
      cred: { icon: 'lock', title: 'Şube girişi başarısız', body: 'Kiosk PIN’i hatalı. Panelden belirlenen PIN’i girin.' },
      revoked: { icon: 'shield', title: 'Cihaz iptal edilmiş', body: 'Bu tablet panelden uzaktan iptal edilmiş. Kiosk açılamaz; yöneticinizle iletişime geçin.' },
    };
    const m = map[issue.kind];
    return (
      <View style={{ flexDirection: 'row', gap: 10, padding: 14, borderRadius: R.md, backgroundColor: C.errBg, borderWidth: 1, borderColor: C.errRing, marginTop: 16 }}>
        <Icon name={m.icon} size={20} color={C.err} />
        <View style={{ flex: 1 }}>
          <T v="bodyS" color={C.errInk} style={{ fontSize: 15 }}>{m.title}</T>
          <T v="sm" color={C.errInk} style={{ marginTop: 2, opacity: 0.9 }}>{m.body}</T>
        </View>
      </View>
    );
  })();

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ paddingTop: 56, paddingHorizontal: 18 }}>
        <RoundButton icon="chevronL" onPress={onBack} bg={C.surface} />
      </View>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22, paddingBottom: 20 + insets.bottom }}>
        <View style={[S.card, { width: '100%', maxWidth: 460, padding: 28 }, shadow.lg]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={[{ width: 48, height: 48, borderRadius: 13, backgroundColor: C.brand600, alignItems: 'center', justifyContent: 'center' }, shadow.brand]}>
              <Icon name="check" size={26} color={C.white} strokeWidth={2.6} />
            </View>
            <View>
              <T v="h2" style={{ fontSize: 22 }}>Şube Girişi</T>
              <T v="sm" color={C.ink3}>Bu tableti şubeye eşleyin</T>
            </View>
          </View>

          <View style={{ gap: 16, marginTop: 24 }}>
            {/* Şube — konumdan otomatik */}
            <View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                <T v="bodyS" color={C.ink2} style={{ fontSize: 13 }}>Şube</T>
                <T v="cap" color={C.ink3}>konumdan otomatik</T>
              </View>
              <View style={{ minHeight: 58, borderRadius: R.md, borderWidth: 1.5, paddingHorizontal: 15, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12, borderColor: branch ? C.brand200 : C.borderStrong, backgroundColor: branch ? C.brand50 : C.surface }}>
                {detecting ? (
                  <><Spinner size={20} width={2} /><T v="body" color={C.ink2}>Konum algılanıyor…</T></>
                ) : branch ? (
                  <>
                    <View style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: C.brand100, alignItems: 'center', justifyContent: 'center' }}><Icon name="pin" size={19} color={C.brand700} /></View>
                    <View style={{ flex: 1 }}>
                      <T v="bodyS" style={{ fontSize: 16 }}>{branch}</T>
                      <T v="cap" color={C.brand700} style={{ marginTop: 1 }}>Konumunuza göre belirlendi</T>
                    </View>
                    <Icon name="check" size={20} color={C.brand600} strokeWidth={2.4} />
                  </>
                ) : (
                  <>
                    <Icon name="alert" size={20} color={C.warnInk} />
                    <View style={{ flex: 1 }}>
                      <T v="sm" color={C.warnInk}>{detectErr === 'denied' ? 'Konum izni gerekli' : 'Konum alınamadı'}</T>
                    </View>
                    <Pressable onPress={detect} hitSlop={8}><T v="sm" color={C.brand700}>Tekrar dene</T></Pressable>
                  </>
                )}
              </View>
            </View>

            <TextField label="Kiosk PIN'i" value={pw} onChangeText={setPw} secure placeholder="Panelden belirlenen PIN" mono />

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 2 }}>
              <Icon name="pin" size={16} color={C.ink3} />
              <T v="cap" color={C.ink3} style={{ flex: 1 }}>Kiosk yalnızca şube konumunda ({GEOFENCE_RADIUS_M} m) açılır.</T>
            </View>
          </View>

          {issueCard}

          <Pressable
            onPress={checking || detecting || !branch ? undefined : handleStart}
            style={({ pressed }) => [{ height: 54, marginTop: 18, borderRadius: R.md, backgroundColor: C.brand600, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }, pressed && { transform: [{ scale: 0.985 }] }, (checking || detecting || !branch) && { opacity: 0.45 }]}>
            {checking
              ? <><Spinner size={18} width={2} trackColor={C.brand300} color={C.white} /><T v="bodyS" color={C.white} style={{ fontSize: 16 }}>Konum doğrulanıyor…</T></>
              : <><Icon name={issue ? 'refresh' : 'check'} size={20} color={C.white} /><T v="bodyS" color={C.white}>{issue ? 'Tekrar dene' : 'Kiosk’u başlat'}</T></>}
          </Pressable>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 }}>
            <T v="monoLabel" color={C.ink3} style={{ textTransform: 'uppercase' }}>CİHAZ</T>
            <T v="cap" mono color={C.ink2}>TBL-0294</T>
            <T color={C.ink3}>·</T>
            <StatusChip status="ok">eşlemeye hazır</StatusChip>
          </View>
        </View>
      </View>
    </View>
  );
}
