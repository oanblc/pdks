// DataRequest.tsx — KVKK "Verilerime erişim talebi" (m.11: erişim / düzeltme / silme)
import React, { useState } from 'react';
import { View, ScrollView, Pressable, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color as C, radius as R } from '../theme/tokens';
import { Icon, IconName } from '../components/Icon';
import { T, Button, RoundButton, SectionLabel, FieldLabel, TextArea, StatusChip, styles as S } from '../components/ui';
import { FadeUp, PopIn } from '../components/anim';
import { api } from '../api';

type ReqType = 'access' | 'rectify' | 'erase';
const OPTIONS: { id: ReqType; icon: IconName; title: string; desc: string }[] = [
  { id: 'access', icon: 'doc', title: 'Verilerime erişim', desc: 'Hakkımda işlenen kişisel verilerin bir kopyasını istiyorum' },
  { id: 'rectify', icon: 'edit', title: 'Düzeltme', desc: 'Eksik veya yanlış işlenen bilgilerimin düzeltilmesini istiyorum' },
  { id: 'erase', icon: 'shield', title: 'Silme', desc: 'Şartların oluşması hâlinde verilerimin silinmesini istiyorum' },
];

export function DataRequestSheet({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [type, setType] = useState<ReqType>('access');
  const [note, setNote] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try { await api.dataRequest(type, note || undefined); setSent(true); }
    catch (e: any) { Alert.alert('Gönderilemedi', e?.message || 'Talep gönderilemedi. Tekrar deneyin.'); } finally { setBusy(false); }
  };

  if (sent) {
    return (
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 }}>
        <PopIn style={{ width: 104, height: 104, borderRadius: 52, backgroundColor: C.ok, alignItems: 'center', justifyContent: 'center', borderWidth: 12, borderColor: C.okBg }}>
          <Icon name="check" size={52} color={C.white} strokeWidth={2.8} />
        </PopIn>
        <FadeUp delay={60}><T v="h1" center style={{ marginTop: 26 }}>Talebiniz alındı</T></FadeUp>
        <FadeUp delay={120}>
          <T v="body" color={C.ink2} center style={{ marginTop: 10, maxWidth: 290 }}>
            KVKK kapsamındaki talebiniz İK departmanına iletildi. Yasal süre içinde (en geç 30 gün) size dönüş yapılacak.
          </T>
        </FadeUp>
        <StatusChip status="warn" style={{ marginTop: 18 }}>İletildi · en geç 30 gün</StatusChip>
        <FadeUp delay={180} style={{ width: '100%' }}>
          <Button variant="primary" full height={56} label="Tamam" onPress={onClose} style={{ marginTop: 34 }} />
        </FadeUp>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.surface }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ paddingTop: 56, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: C.border, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <RoundButton icon="chevronL" onPress={onClose} />
        <View>
          <T v="h3">Verilerime erişim</T>
          <T v="cap" color={C.ink3}>KVKK ilgili kişi talebi</T>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 20 }} keyboardShouldPersistTaps="handled">
        <T v="body" color={C.ink2}>6698 sayılı KVKK m.11 kapsamında, kişisel verilerinizle ilgili aşağıdaki haklarınızı kullanabilirsiniz.</T>

        <SectionLabel style={{ paddingTop: 20 }}>TALEP TÜRÜ</SectionLabel>
        <View style={{ gap: 12 }}>
          {OPTIONS.map(o => {
            const on = type === o.id;
            return (
              <Pressable key={o.id} onPress={() => setType(o.id)} style={[S.card, { padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, borderColor: on ? C.brand500 : C.border, backgroundColor: on ? C.brand50 : C.surface }]}>
                <View style={{ width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? C.brand100 : C.surface2 }}>
                  <Icon name={o.icon} size={22} color={on ? C.brand700 : C.ink2} />
                </View>
                <View style={{ flex: 1 }}>
                  <T v="bodyS">{o.title}</T>
                  <T v="cap" color={C.ink3} style={{ marginTop: 2 }}>{o.desc}</T>
                </View>
                <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: on ? C.brand600 : C.borderStrong, backgroundColor: on ? C.brand600 : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                  {on && <Icon name="check" size={14} color={C.white} strokeWidth={3} />}
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={{ marginTop: 18 }}>
          <FieldLabel>Açıklama (opsiyonel)</FieldLabel>
          <TextArea placeholder="Talebinizle ilgili eklemek istedikleriniz…" value={note} onChangeText={setNote} />
        </View>

        <View style={[S.cardFlat, { flexDirection: 'row', gap: 10, padding: 14, marginTop: 16, alignItems: 'flex-start' }]}>
          <Icon name="info" size={20} color={C.ink2} />
          <T v="cap" color={C.ink2} style={{ flex: 1, lineHeight: 18 }}>Talebiniz kimliğiniz doğrulanarak İK tarafından değerlendirilir ve yasal süre içinde yanıtlanır.</T>
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16 + insets.bottom, borderTopWidth: 1, borderTopColor: C.border }}>
        <Button variant="primary" full height={56} label={busy ? 'Gönderiliyor…' : 'Talebi gönder'} onPress={busy ? undefined : submit} style={busy ? { opacity: 0.6 } : undefined} />
      </View>
    </KeyboardAvoidingView>
  );
}
