// HomeScreen.tsx — A2 Ana ekran (DIŞARIDA / İÇERİDE / MOLADA) + A5 Mola
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { color as C, radius as R } from '../theme/tokens';
import { Icon } from '../components/Icon';
import { T, StatusChip, Avatar, ActionButton, BreakButton, RoundButton, useTicker, styles as S } from '../components/ui';
import { FadeUp, LiveDot } from '../components/anim';
import { EMPLOYEE, Status, Action } from '../data';
import { api } from '../api';

export interface HomeApi {
  status: Status;
  entryTime: number | null;
  breakStart: number | null;
  employee: typeof EMPLOYEE;
  shift: string;
  punch: (action: Action) => void;
  openProfile: () => void;
  openNotif: () => void;
}

function GreetingHeader({ name, onProfile, onBell, hasNotif }: { name: string; onProfile: () => void; onBell: () => void; hasNotif: boolean }) {
  const hour = new Date().getHours();
  const sel = hour < 12 ? 'Günaydın' : hour < 18 ? 'İyi günler' : 'İyi akşamlar';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 54, paddingHorizontal: 20, paddingBottom: 8, gap: 12 }}>
      <View style={{ minWidth: 0 }}>
        <T v="cap" color={C.ink3}>{sel}</T>
        <T v="h2" style={{ marginTop: 2 }} numberOfLines={1}>{name}</T>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View>
          <RoundButton icon="bell" onPress={onBell} size={42} bg={C.surface2} iconColor={C.ink2} iconSize={21} />
          {hasNotif && <View style={{ position: 'absolute', top: 8, right: 9, width: 8, height: 8, borderRadius: 4, backgroundColor: C.err, borderWidth: 1.5, borderColor: C.surface2 }} />}
        </View>
        <RoundButton icon="user" onPress={onProfile} size={42} bg={C.brand100} iconColor={C.brand700} />
      </View>
    </View>
  );
}

function ShiftRow({ shift }: { shift: string }) {
  return (
    <View style={[S.cardFlat, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingVertical: 13, marginTop: 14 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Icon name="clock" size={19} color={C.ink2} />
        <T v="sm" color={C.ink2}>Vardiya</T>
      </View>
      <T v="bodyS" mono>{shift}</T>
    </View>
  );
}

export function HomeScreen({ app }: { app: HomeApi }) {
  const insets = useSafeAreaInsets();
  const { status, entryTime, breakStart, employee, shift } = app;
  const liveWork = useTicker(entryTime, status === 'inside');
  const liveBreak = useTicker(breakStart, status === 'break');
  const entryClock = entryTime ? new Date(entryTime).toTimeString().slice(0, 5) : '--:--';
  const [hasNotif, setHasNotif] = useState(false);
  useEffect(() => { api.notifications().then(n => setHasNotif(n.length > 0)).catch(() => {}); }, []);

  return (
    <View style={{ flex: 1 }}>
      <GreetingHeader name={employee.name} onProfile={app.openProfile} onBell={app.openNotif} hasNotif={hasNotif} />

      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 14, justifyContent: 'space-between' }}>
        {/* ── DURUM KARTI ── */}
        <View>
          {status === 'outside' && (
            <FadeUp style={[S.card, { padding: 22 }]}>
              <StatusChip status="neu">Dışarıdasınız</StatusChip>
              <T v="h1" style={{ marginTop: 14 }}>Henüz giriş{'\n'}yapmadınız</T>
              <T v="body" color={C.ink2} style={{ marginTop: 8 }}>Şube tabletindeki QR kodunu okutarak giriş yapın.</T>
              <ShiftRow shift={shift} />
            </FadeUp>
          )}

          {status === 'inside' && (
            <FadeUp style={[S.card, { borderColor: C.okRing, overflow: 'hidden' }]}>
              <LinearGradient colors={[C.okBg, C.surface]} locations={[0, 0.62]} style={{ padding: 22 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <StatusChip status="ok">İçeridesiniz</StatusChip>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <LiveDot />
                    <T v="cap" color={C.okInk}>canlı</T>
                  </View>
                </View>
                <T v="counter" tnum center color={C.okInk} style={{ fontSize: 44, lineHeight: 46, marginTop: 18 }}>{liveWork}</T>
                <T v="body" color={C.ink2} style={{ marginTop: 10 }}>
                  <T v="bodyS">{entryClock}</T>’de giriş yaptınız · {employee.branch}
                </T>
                <ShiftRow shift={shift} />
              </LinearGradient>
            </FadeUp>
          )}

          {status === 'break' && (
            <FadeUp style={[S.card, { borderColor: C.warnRing, overflow: 'hidden' }]}>
              <LinearGradient colors={[C.warnBg, C.surface]} locations={[0, 0.62]} style={{ padding: 22 }}>
                <StatusChip status="warn">Molada</StatusChip>
                <T v="counter" tnum center color={C.warnInk} style={{ fontSize: 44, lineHeight: 46, marginTop: 18 }}>{liveBreak}</T>
                <T v="body" color={C.ink2} style={{ marginTop: 10 }}>Mola süreniz işleniyor. Döndüğünüzde sayaç çalışmaya devam eder.</T>
              </LinearGradient>
            </FadeUp>
          )}
        </View>

        {/* ── EYLEM ALANI ── */}
        <View style={{ paddingBottom: 18 + insets.bottom, gap: 12 }}>
          {status === 'outside' && (
            <>
              <ActionButton kind="enter" icon="camera" label="GİRİŞ YAP" onPress={() => app.punch('enter')} />
              <T v="cap" color={C.ink3} center>QR’ı okutmak 3 saniyenizi alır</T>
            </>
          )}
          {status === 'inside' && (
            <>
              <ActionButton kind="exit" icon="camera" label="ÇIKIŞ YAP" onPress={() => app.punch('exit')} />
              <BreakButton icon="coffee" label="Molaya çık" onPress={() => app.punch('break-out')} />
            </>
          )}
          {status === 'break' && (
            <ActionButton kind="warn" icon="swap" label="Moladan dön" onPress={() => app.punch('break-in')} />
          )}
        </View>
      </View>
    </View>
  );
}
