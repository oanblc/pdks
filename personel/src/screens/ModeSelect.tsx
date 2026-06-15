// ModeSelect.tsx — uygulama açılışında ilk ekran: Çalışan Girişi mi, Şube Kiosk Modu mu?
// (Aynı uygulamanın iki ayrı girişi — kararımız gereği.)
import React from 'react';
import { View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color as C } from '../theme/tokens';
import { Icon, IconName } from '../components/Icon';
import { T, styles as S } from '../components/ui';
import { FadeUp } from '../components/anim';
import { Brandmark } from './Onboarding';

export type AppMode = 'employee' | 'kiosk';

function ModeCard({ icon, title, onPress, delay }:
  { icon: IconName; title: string; onPress: () => void; delay: number }) {
  return (
    <FadeUp delay={delay} style={{ width: '100%' }}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [S.card, { padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 }, pressed && { transform: [{ scale: 0.985 }], backgroundColor: C.surface2 }]}>
        <View style={{ width: 52, height: 52, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: C.brand50 }}>
          <Icon name={icon} size={28} color={C.brand700} />
        </View>
        <T v="h3" style={{ flex: 1 }}>{title}</T>
        <Icon name="chevron" size={20} color={C.ink3} />
      </Pressable>
    </FadeUp>
  );
}

export function ModeSelect({ onSelect }: { onSelect: (m: AppMode) => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: C.surface, paddingHorizontal: 24, paddingTop: 90, paddingBottom: 20 + insets.bottom }}>
      <View style={{ alignItems: 'center' }}>
        <Brandmark size={60} />
      </View>

      <View style={{ flex: 1, justifyContent: 'center' }}>
        <FadeUp>
          <T v="h1" center>Nasıl devam edelim?</T>
          <T v="body" color={C.ink2} center style={{ marginTop: 8, marginBottom: 28 }}>
            Bu cihazı nasıl kullanacağınızı seçin.
          </T>
        </FadeUp>

        <View style={{ gap: 14 }}>
          <ModeCard icon="phone" title="Çalışan Girişi" onPress={() => onSelect('employee')} delay={60} />
          <ModeCard icon="building" title="Şube Kiosk Modu" onPress={() => onSelect('kiosk')} delay={120} />
        </View>
      </View>

      <T v="cap" color={C.ink3} center>Çalışan PDKS · sürüm 1.0.0</T>
    </View>
  );
}
