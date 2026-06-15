// Kiosk.tsx — B1 Kiosk ana ekran + B2 teyit overlay + B3 offline
import React, { useEffect, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color as C, radius as R, shadow } from '../../theme/tokens';
import { Icon } from '../../components/Icon';
import { T, StatusChip, Avatar, Button, styles as S } from '../../components/ui';
import { PopIn, LiveDot, Spinner } from '../../components/anim';
import QRCodeSvg from 'react-native-qrcode-svg';

const GUNLER = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

export function useClock() {
  const [, f] = useState(0);
  useEffect(() => { const id = setInterval(() => f(n => n + 1), 1000); return () => clearInterval(id); }, []);
  const d = new Date();
  const hm = d.toTimeString().slice(0, 5);
  const ss = String(d.getSeconds()).padStart(2, '0');
  const date = `${GUNLER[d.getDay()]}, ${d.getDate()} ${AYLAR[d.getMonth()]}`;
  return { hm, ss, date };
}

export function SyncPill({ offline, syncing, queued = 0, lastSync = '—' }:
  { offline?: boolean; syncing?: boolean; queued?: number; lastSync?: string }) {
  if (syncing) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, paddingHorizontal: 14, borderRadius: R.full, backgroundColor: C.brand50, borderWidth: 1, borderColor: C.brand100 }}>
        <Spinner size={15} width={2} />
        <T v="sm" color={C.brand700}>Senkronize ediliyor… {queued} kayıt</T>
      </View>
    );
  }
  if (offline) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, paddingHorizontal: 14, borderRadius: R.full, backgroundColor: C.warnBg, borderWidth: 1, borderColor: C.warnRing }}>
        <Icon name="wifiOff" size={18} color={C.warnInk} />
        <T v="sm" color={C.warnInk}>Çevrimdışı · {queued} kayıt kuyrukta</T>
        <T v="cap" color={C.warnInk} style={{ opacity: 0.7 }}>son sync {lastSync}</T>
      </View>
    );
  }
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, paddingHorizontal: 14, borderRadius: R.full, backgroundColor: C.okBg, borderWidth: 1, borderColor: C.okRing }}>
      <LiveDot /><T v="sm" color={C.okInk}>Bağlı · Senkron</T>
    </View>
  );
}

export function KioskScreen({ offline, lastSync, branch, branchId, deviceCode, onManager }:
  { offline?: boolean; lastSync?: string; branch: string; branchId?: number; deviceCode?: string; onManager: () => void }) {
  const insets = useSafeAreaInsets();
  const { hm, ss, date } = useClock();
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const qr = Math.min(240, Math.round(width - 150));
  const [seed, setSeed] = useState(7);
  const [refreshing, setRefreshing] = useState(false);

  const BrandBox = (
    <View style={[{ width: 46, height: 46, borderRadius: 13, backgroundColor: C.brand600, alignItems: 'center', justifyContent: 'center' }, shadow.brand]}>
      <Icon name="check" size={24} color={C.white} strokeWidth={2.6} />
    </View>
  );
  useEffect(() => {
    const id = setInterval(() => { setRefreshing(true); setTimeout(() => { setSeed(s => (s * 7 + 13) >>> 0); setRefreshing(false); }, 320); }, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* header */}
      {landscape ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 28, paddingTop: 56 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
            {BrandBox}
            <View style={{ flex: 1, minWidth: 0 }}>
              <T v="h2" numberOfLines={1}>{branch}</T>
              <T v="sm" color={C.ink3} numberOfLines={1}>{date}</T>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
            <T v="counter" tnum style={{ fontSize: 48 }}>{hm}</T>
            <T v="h2" tnum color={C.ink3} style={{ fontSize: 22, marginBottom: 4 }}>:{ss}</T>
          </View>
        </View>
      ) : (
        <View style={{ alignItems: 'center', paddingTop: 52, paddingHorizontal: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {BrandBox}
            <View>
              <T v="h2">{branch}</T>
              <T v="sm" color={C.ink3}>{date}</T>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 10 }}>
            <T v="counter" tnum style={{ fontSize: 46, lineHeight: 48 }}>{hm}</T>
            <T v="h2" tnum color={C.ink3} style={{ fontSize: 21, marginBottom: 4 }}>:{ss}</T>
          </View>
        </View>
      )}

      {/* center QR */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24 }}>
        <View style={[{ padding: 26, backgroundColor: C.surface, borderRadius: R.xxl, borderWidth: 1, borderColor: C.border }, shadow.lg]}>
          <View style={{ opacity: refreshing ? 0.25 : 1 }}>
            <QRCodeSvg value={JSON.stringify({ b: branchId ?? 0, d: deviceCode ?? '', t: seed })} size={qr} color={C.ink} backgroundColor={C.surface} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 }}>
            <LiveDot size={7} color={C.brand500} />
            <T v="cap" color={C.ink3}>Kod her 5 sn’de yenilenir</T>
          </View>
        </View>
        <View style={{ alignItems: 'center', paddingHorizontal: 20 }}>
          <T v="h1" center style={{ fontSize: 26 }}>Telefonunuzla okutun</T>
          <T v="body" color={C.ink2} center style={{ marginTop: 6 }}>Uygulamadaki “GİRİŞ / ÇIKIŞ YAP” ile bu kodu tarayın</T>
        </View>
      </View>

      {/* footer */}
      <View style={{ paddingHorizontal: 24, paddingBottom: 24 + insets.bottom }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <SyncPill offline={offline} lastSync={lastSync} />
          <Button variant="ghost" height={46} icon="lock" iconColor={C.ink} label="Yönetici" onPress={onManager} />
        </View>
      </View>
    </View>
  );
}

export type Confirm = { name: string; action: 'enter' | 'exit'; time: string; queued?: boolean };

export function ConfirmOverlay({ data, onDone }: { data: Confirm; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 2400); return () => clearTimeout(t); }, []);
  const enter = data.action === 'enter';
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(13,20,19,0.55)', alignItems: 'center', justifyContent: 'center' }}>
      <PopIn style={[{ backgroundColor: C.surface, borderRadius: R.xxl, paddingVertical: 40, paddingHorizontal: 48, alignItems: 'center', minWidth: 320 }, shadow.lg]}>
        <View style={{ width: 132, height: 132 }}>
          <Avatar name={data.name} size={132} />
          <View style={{ position: 'absolute', right: -4, bottom: -4, width: 48, height: 48, borderRadius: 24, backgroundColor: enter ? C.ok : C.ink, borderWidth: 4, borderColor: C.white, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="check" size={26} color={C.white} strokeWidth={2.8} />
          </View>
        </View>
        <T v="h1" center style={{ marginTop: 22 }}>Hoş geldin, {data.name.split(' ')[0]}</T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 }}>
          <StatusChip status={enter ? 'ok' : 'neu'}>{enter ? 'Giriş' : 'Çıkış'}</StatusChip>
          <T v="h2" mono tnum>{data.time}</T>
        </View>
        {data.queued && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 }}>
            <Icon name="wifiOff" size={16} color={C.warnInk} />
            <T v="sm" color={C.warnInk}>Çevrimdışı — kaydınız kuyruğa alındı, bağlantıda gönderilecek.</T>
          </View>
        )}
      </PopIn>
    </View>
  );
}
