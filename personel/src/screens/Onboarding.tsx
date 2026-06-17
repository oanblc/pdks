// Onboarding.tsx — açılış akışı: uygulama tanıtımı + gerekli izinler (konum / bildirim / kamera)
import React, { useState } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { useCameraPermissions } from 'expo-camera';
import { color as C, font } from '../theme/tokens';
import { Icon, IconName } from '../components/Icon';
import { T, Button, RoundButton, Dots, StatusChip } from '../components/ui';
import { FadeUp, PopIn } from '../components/anim';

export function Brandmark({ size = 56, showText = true }: { size?: number; showText?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ width: size, height: size, borderRadius: size * 0.28, backgroundColor: C.brand600, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="check" size={size * 0.5} color={C.white} strokeWidth={2.6} />
      </View>
      {showText && (
        <View>
          <T v="h2" style={{ letterSpacing: -0.66 }}>puanto</T>
          <T v="monoLabel" color={C.ink3} style={{ fontSize: 10, textTransform: 'uppercase' }}>ÇALIŞAN PDKS</T>
        </View>
      )}
    </View>
  );
}

type PermKind = 'location' | 'notif' | 'camera';
type Step =
  | { kind: 'intro'; brand?: boolean; icon: IconName; title: string; desc: string }
  | { kind: 'perms' }
  | { kind: 'ready' };

const STEPS: Step[] = [
  { kind: 'intro', brand: true, icon: 'check', title: 'puanto’ya hoş geldiniz', desc: 'İşe giriş-çıkışınızı saniyeler içinde yapın, çalışma saatlerinizi tek yerden takip edin.' },
  { kind: 'intro', icon: 'qr', title: 'QR ile giriş-çıkış', desc: 'Şube tabletindeki QR kodunu telefonunuzla okutun — giriş ve çıkış yalnızca 3 saniye.' },
  { kind: 'intro', icon: 'calendar', title: 'Puantaj ve talepler', desc: 'Çalışma sürenizi ve fazla mesainizi görün; izin veya eksik-okutma düzeltme talebi oluşturun.' },
  { kind: 'perms' },
  { kind: 'ready' },
];

const PERMS: { perm: PermKind; icon: IconName; title: string; desc: string }[] = [
  { perm: 'location', icon: 'pin', title: 'Konum', desc: 'Girişin doğru şubede yapıldığını doğrular; “Her zaman” önerilir.' },
  { perm: 'notif', icon: 'bell', title: 'Bildirim', desc: 'Geç giriş, eksik çıkış, mola ve izin sonucu bildirimleri.' },
  { perm: 'camera', icon: 'camera', title: 'Kamera', desc: 'Şube QR’ını okutarak giriş-çıkış için.' },
];

export function OnboardingFlow({ start = 0, onComplete }: { start?: number; onComplete: () => void }) {
  const [step, setStep] = useState(start);
  const [, requestCamera] = useCameraPermissions();
  const total = STEPS.length;
  const next = () => (step >= total - 1 ? onComplete() : setStep(s => s + 1));
  const back = () => setStep(s => Math.max(0, s - 1));

  const request = async (perm: PermKind): Promise<boolean> => {
    if (perm === 'location') {
      const { status } = await Location.requestForegroundPermissionsAsync();
      // Ön plan verildiyse arka plan ("Her zaman") iznini de iste — hatırlatmalar için.
      // Reddedilirse uygulama bloklanmaz; geofence sessizce devre dışı kalır.
      if (status === 'granted') { try { await Location.requestBackgroundPermissionsAsync(); } catch { /* yoksay */ } }
      return status === 'granted';
    }
    if (perm === 'notif') { const { status } = await Notifications.requestPermissionsAsync(); return status === 'granted'; }
    const r = await requestCamera(); return !!r?.granted;
  };
  const s = STEPS[step];

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.surface }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingHorizontal: 18, paddingBottom: 8 }}>
        <View style={{ width: 64, alignItems: 'flex-start' }}>
          {step > 0 && <RoundButton icon="chevronL" onPress={back} />}
        </View>
        <Dots total={total} index={step} />
        <View style={{ width: 64, alignItems: 'flex-end' }}>
          {s.kind !== 'ready' && <Pressable onPress={onComplete} hitSlop={8}><T v="sm" color={C.ink3}>Atla</T></Pressable>}
        </View>
      </View>

      <View style={{ flex: 1 }}>
        {s.kind === 'intro' && <IntroStep key={step} step={s} onNext={next} />}
        {s.kind === 'perms' && <PermsStep onNext={next} request={request} />}
        {s.kind === 'ready' && <ReadyStep onComplete={onComplete} />}
      </View>
    </View>
  );
}

function IntroStep({ step, onNext }: { step: Extract<Step, { kind: 'intro' }>; onNext: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 12, paddingBottom: 24 + insets.bottom }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        {step.brand && <View style={{ marginBottom: 28 }}><Brandmark /></View>}
        {!step.brand && (
          <PopIn style={{ width: 96, height: 96, borderRadius: 28, backgroundColor: C.brand50, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={step.icon} size={46} color={C.brand700} />
          </PopIn>
        )}
        <FadeUp delay={60}><T v="h1" center style={{ marginTop: step.brand ? 4 : 28 }}>{step.title}</T></FadeUp>
        <FadeUp delay={120}><T v="body" color={C.ink2} center style={{ marginTop: 10, maxWidth: 300 }}>{step.desc}</T></FadeUp>
      </View>
      <Button variant="primary" full height={56} label="Devam et" onPress={onNext} />
    </View>
  );
}

type PStatus = 'idle' | 'granted' | 'denied';
function PermsStep({ onNext, request }: { onNext: () => void; request: (p: PermKind) => Promise<boolean> }) {
  const insets = useSafeAreaInsets();
  const [st, setSt] = useState<Record<PermKind, PStatus>>({ location: 'idle', notif: 'idle', camera: 'idle' });
  const [busy, setBusy] = useState<PermKind | 'all' | null>(null);

  const ask = async (perm: PermKind) => {
    setBusy(perm);
    try { setSt(s => ({ ...s, [perm]: 'granted' })); const ok = await request(perm); setSt(s => ({ ...s, [perm]: ok ? 'granted' : 'denied' })); }
    catch { setSt(s => ({ ...s, [perm]: 'denied' })); }
    finally { setBusy(null); }
  };
  const askAll = async () => {
    setBusy('all');
    for (const { perm } of PERMS) {
      if (st[perm] === 'granted') continue;
      try { const ok = await request(perm); setSt(s => ({ ...s, [perm]: ok ? 'granted' : 'denied' })); }
      catch { setSt(s => ({ ...s, [perm]: 'denied' })); }
    }
    setBusy(null);
  };

  const grantedCount = PERMS.filter(p => st[p.perm] === 'granted').length;
  const allGranted = grantedCount === PERMS.length;
  const anyDenied = PERMS.some(p => st[p.perm] === 'denied');

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 4, paddingBottom: 12 }} showsVerticalScrollIndicator={false}>
        <View style={{ alignItems: 'center', marginBottom: 14, marginTop: 2 }}>
          <PopIn style={{ width: 58, height: 58, borderRadius: 17, backgroundColor: C.brand50, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="shield" size={29} color={C.brand700} />
          </PopIn>
          <T v="h2" center style={{ marginTop: 12 }}>Gerekli izinler</T>
          <T v="sm" color={C.ink2} center style={{ marginTop: 6, maxWidth: 320 }}>puanto’nun çalışması için üç izne ihtiyaç var.</T>
        </View>

        <View style={{ gap: 9 }}>
          {PERMS.map(({ perm, icon, title, desc }) => {
            const s = st[perm];
            const tone = s === 'granted' ? C.ok : s === 'denied' ? C.warn : C.brand700;
            const bg = s === 'granted' ? C.okBg : s === 'denied' ? C.warnBg : C.brand50;
            return (
              <View key={perm} style={{ flexDirection: 'row', alignItems: 'center', gap: 11, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: s === 'denied' ? C.warnRing : C.border, backgroundColor: C.surface }}>
                <View style={{ width: 40, height: 40, borderRadius: 11, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={s === 'granted' ? 'check' : icon} size={21} color={tone} strokeWidth={s === 'granted' ? 2.6 : 1.9} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <T v="bodyS" style={{ fontSize: 15 }}>{title}</T>
                  <T v="cap" color={C.ink3} style={{ marginTop: 1 }}>{desc}</T>
                </View>
                {s === 'granted'
                  ? <StatusChip status="ok">Verildi</StatusChip>
                  : <Pressable disabled={busy != null} onPress={() => ask(perm)} style={{ height: 36, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: s === 'denied' ? C.warnRing : C.brand200, backgroundColor: s === 'denied' ? C.warnBg : C.brand50, alignItems: 'center', justifyContent: 'center', opacity: busy != null && busy !== perm ? 0.5 : 1 }}>
                      <T v="sm" color={s === 'denied' ? C.warnInk : C.brand700} style={{ fontFamily: font.medium }}>{busy === perm ? '…' : s === 'denied' ? 'Tekrar' : 'İzin ver'}</T>
                    </Pressable>}
              </View>
            );
          })}
        </View>

        {anyDenied && (
          <View style={{ flexDirection: 'row', gap: 10, padding: 13, borderRadius: 14, backgroundColor: C.warnBg, borderWidth: 1, borderColor: C.warnRing, marginTop: 16 }}>
            <Icon name="alert" size={18} color={C.warnInk} />
            <T v="cap" color={C.warnInk} style={{ flex: 1 }}>Reddedilen izinler olmadan ilgili özellikler çalışmaz (konum → giriş doğrulama, kamera → QR okutma). Cihaz ayarlarından sonradan açabilirsiniz.</T>
          </View>
        )}
      </ScrollView>

      <View style={{ gap: 4, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 14 + insets.bottom, borderTopWidth: 1, borderTopColor: C.border }}>
        {!allGranted && <Button variant="primary" full height={52} icon="check" iconColor={C.white} label={busy === 'all' ? 'İsteniyor…' : 'Tümüne izin ver'} onPress={busy != null ? undefined : askAll} style={busy != null ? { opacity: 0.6 } : undefined} />}
        <Button variant={allGranted ? 'primary' : 'quiet'} full={allGranted} height={48} label={allGranted ? 'Devam et' : 'Şimdilik atla'} onPress={onNext} style={{ alignSelf: 'center' }} />
      </View>
    </View>
  );
}

function ReadyStep({ onComplete }: { onComplete: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 26, paddingBottom: 28 + insets.bottom }}>
      <PopIn style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: C.ok, alignItems: 'center', justifyContent: 'center', borderWidth: 14, borderColor: C.okBg }}>
        <Icon name="check" size={62} color={C.white} strokeWidth={2.8} />
      </PopIn>
      <FadeUp delay={60}><T v="h1" center style={{ marginTop: 28 }}>Hazırsınız</T></FadeUp>
      <FadeUp delay={120}><T v="body" color={C.ink2} center style={{ marginTop: 10, maxWidth: 280 }}>Artık çalışan girişiyle hesabınıza girebilir veya bu cihazı şube kiosk’u olarak kurabilirsiniz.</T></FadeUp>
      <FadeUp delay={180} style={{ width: '100%' }}>
        <Button variant="primary" full height={56} label="Başla" onPress={onComplete} style={{ marginTop: 34 }} />
      </FadeUp>
    </View>
  );
}
