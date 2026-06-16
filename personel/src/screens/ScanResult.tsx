// ScanResult.tsx — A3 QR Okutma (gerçek kamera) + A4 Okutma Sonucu (başarılı / kuyrukta / hata)
import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { color as C, radius as R, font } from '../theme/tokens';
import { Icon } from '../components/Icon';
import { T, StatusChip, Button, ActionButton, RoundButton, styles as S } from '../components/ui';
import { FadeUp, PopIn, LiveDot, ScanSweep } from '../components/anim';
import { Action, ACTION } from '../data';

export type ResultKind = 'success' | 'queued' | 'error';

/* ── A3: QR Okutma — gerçek kamera (expo-camera) ── */
export type ScanInfo = { branchId?: number; deviceCode?: string };
export function ScanScreen({ action, onResult, onClose }:
  { action: Action; onResult: (scan?: ScanInfo) => void; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<'scanning' | 'locked'>('scanning');
  const handled = useRef(false);
  const label = ACTION[action].scanTitle;
  const granted = !!permission?.granted;
  const locked = phase === 'locked';

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) requestPermission();
  }, [permission]);

  const onScanned = (e?: { data?: string }) => {
    if (handled.current) return;
    handled.current = true;
    // QR içeriği: {"b":branchId,"d":"TBL-xxxx"} — okutulan ekranın kodunu çıkar
    let scan: ScanInfo | undefined;
    try { const j = JSON.parse(e?.data || ''); if (j && (j.b || j.d)) scan = { branchId: j.b || undefined, deviceCode: j.d || undefined }; } catch {}
    setPhase('locked');
    setTimeout(() => onResult(scan), 650);
  };

  const bc = locked ? C.ok : C.white;
  const BOX = 220;
  const corner = (pos: 'tl' | 'tr' | 'bl' | 'br') => {
    const base: any = { position: 'absolute', width: 34, height: 34, borderColor: bc };
    const m: any = {
      tl: { top: -2, left: -2, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 14 },
      tr: { top: -2, right: -2, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 14 },
      bl: { bottom: -2, left: -2, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 14 },
      br: { bottom: -2, right: -2, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 14 },
    };
    return <View key={pos} style={[base, m[pos]]} />;
  };

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.surface, paddingBottom: 20 + insets.bottom }}>
      {/* başlık */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingTop: 56, paddingHorizontal: 18, paddingBottom: 14 }}>
        <View>
          <T v="monoLabel" color={C.ink3} style={{ textTransform: 'uppercase' }}>{label} için</T>
          <T v="h2" style={{ marginTop: 3 }}>QR Kodu Okutun</T>
        </View>
        <RoundButton icon="x" onPress={onClose} />
      </View>

      {/* kamera viewport */}
      <View style={{ flex: 1, paddingHorizontal: 18 }}>
        <View style={{ flex: 1, borderRadius: R.xxl, overflow: 'hidden', backgroundColor: '#15201f' }}>
          {granted ? (
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={locked ? undefined : onScanned}
            />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 }}>
              <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="camera" size={32} color={'rgba(255,255,255,0.85)'} />
              </View>
              <T v="h3" color={C.white} center style={{ marginTop: 18 }}>Kamera izni gerekli</T>
              <T v="sm" color={'rgba(255,255,255,0.7)'} center style={{ marginTop: 6, maxWidth: 260 }}>QR kodu okutabilmek için kameraya erişim verin.</T>
              <Button variant="primary" label="Kamera izni ver" onPress={() => (permission?.canAskAgain ? requestPermission() : Linking.openSettings())} style={{ marginTop: 18 }} />
            </View>
          )}

          {granted && (
            <>
              {/* hedef çerçeve */}
              <View style={{ position: 'absolute', top: '50%', left: '50%', width: BOX, height: BOX, marginLeft: -BOX / 2, marginTop: -BOX * 0.54 }}>
                {(['tl', 'tr', 'bl', 'br'] as const).map(corner)}
                {!locked && <ScanSweep height={BOX} />}
                {locked && (
                  <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
                    <PopIn style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: C.ok, alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="check" size={34} color={C.white} strokeWidth={2.6} />
                    </PopIn>
                  </View>
                )}
              </View>

              {/* yönerge */}
              <View style={{ position: 'absolute', left: 0, right: 0, bottom: 24, alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  {!locked ? <LiveDot color={C.white} /> : <Icon name="check" size={16} color={C.ok} strokeWidth={3} />}
                  <T v="sm" color={C.white}>{locked ? 'Kod okundu' : 'QR aranıyor…'}</T>
                </View>
                <T v="cap" color={'rgba(255,255,255,0.6)'}>Kodu çerçeveye hizalayın</T>
              </View>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

/* ── Animasyonlu onay rozeti ── */
function ResultBadge({ kind }: { kind: ResultKind }) {
  const map = {
    success: { bg: C.ok, ring: 'rgba(31,138,91,0.18)', icon: <Icon name="check" size={64} color={C.white} strokeWidth={2.8} /> },
    queued: { bg: C.warn, ring: 'rgba(179,115,12,0.18)', icon: <Icon name="clock" size={58} color={C.white} strokeWidth={2.2} /> },
    error: { bg: C.err, ring: 'rgba(197,55,43,0.18)', icon: <Icon name="refresh" size={58} color={C.white} strokeWidth={2.4} /> },
  }[kind];
  return (
    <View style={{ width: 156, height: 156, borderRadius: 78, alignItems: 'center', justifyContent: 'center', backgroundColor: map.ring }}>
      <PopIn style={{ width: 128, height: 128, borderRadius: 64, backgroundColor: map.bg, alignItems: 'center', justifyContent: 'center' }}>
        {map.icon}
      </PopIn>
    </View>
  );
}

/* ── A4: Okutma Sonucu ── */
export function ResultScreen({ kind, action, time, branch, message, onDone, onRetry }:
  { kind: ResultKind; action: Action; time: string; branch: string; message?: string; onDone: () => void; onRetry: () => void }) {
  const insets = useSafeAreaInsets();
  const cfg = ACTION[action];
  const title = kind === 'success' ? cfg.okTitle : kind === 'queued' ? cfg.queuedTitle : 'TEKRAR DENEYİN';
  const toneInk = { ok: C.okInk, warn: C.warnInk, neu: C.neuInk }[cfg.chipTone];
  const tone = kind === 'success' ? toneInk : kind === 'queued' ? C.warnInk : C.errInk;

  useEffect(() => {
    if (kind === 'success' || kind === 'queued') { const t = setTimeout(onDone, 2600); return () => clearTimeout(t); }
  }, []);

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.surface }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 26 }}>
        <ResultBadge kind={kind} />

        <FadeUp delay={60}>
          <T v="monoLabel" color={tone} center style={{ marginTop: 30, fontSize: 13, textTransform: 'uppercase' }}>{title}</T>
        </FadeUp>

        {kind !== 'error' ? (
          <>
            <FadeUp delay={60}><T v="counter" tnum center style={{ marginTop: 8 }}>{time}</T></FadeUp>
            <FadeUp delay={120}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 }}>
                <Icon name="pin" size={18} color={C.ink2} />
                <T v="body" color={C.ink2}>{branch}</T>
                <T v="body" color={C.ink3}>·</T>
                <StatusChip status={kind === 'queued' ? 'warn' : cfg.chipTone}>{cfg.chipLabel}</StatusChip>
              </View>
            </FadeUp>
            {kind === 'queued' && (
              <FadeUp delay={180} style={{ maxWidth: 320 }}>
                <View style={[S.cardFlat, { marginTop: 26, paddingVertical: 14, paddingHorizontal: 16, borderColor: C.warnRing, backgroundColor: C.warnBg, flexDirection: 'row', gap: 10, alignItems: 'flex-start' }]}>
                  <Icon name="wifiOff" size={20} color={C.warnInk} />
                  <T v="sm" color={C.warnInk} style={{ flex: 1 }}>Bağlantı yok — kaydınız güvende. İnternet gelince otomatik gönderilecek.</T>
                </View>
              </FadeUp>
            )}
          </>
        ) : (
          <FadeUp delay={60} style={{ maxWidth: 300 }}>
            <T v="h3" color={C.ink2} center style={{ marginTop: 14, fontFamily: font.medium }}>{message || 'QR’ı çerçevede net tutun ve tekrar deneyin.'}</T>
          </FadeUp>
        )}
      </View>

      <View style={{ paddingHorizontal: 22, paddingBottom: 22 + insets.bottom, gap: 10 }}>
        {kind === 'error' && <ActionButton kind="enter" icon="refresh" label="Tekrar dene" onPress={onRetry} />}
        {kind === 'success' && <Button variant="ghost" full label="Tamam" onPress={onDone} />}
        {kind === 'queued' && <Button variant="primary" full label="Anladım" onPress={onDone} />}
        {kind === 'error' && <Button variant="quiet" label="Vazgeç" onPress={onDone} style={{ alignSelf: 'center' }} />}
      </View>
    </View>
  );
}
