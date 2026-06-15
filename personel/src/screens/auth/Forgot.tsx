// Forgot.tsx — Şifremi unuttum (SMS'siz, yönetici-aracılı sıfırlama)
import React, { useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color as C } from '../../theme/tokens';
import { T, TopBar, Button, TextField, StatusChip, styles as S } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { FadeUp, PopIn } from '../../components/anim';
import { api } from '../../api';

export function Forgot({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const [tc, setTc] = useState('');
  const [phone, setPhone] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const canSubmit = tc.length === 11 && phone.length >= 10;

  const submit = async () => {
    if (!canSubmit || busy) return;
    setBusy(true);
    try { await api.forgot(tc, phone); }
    catch { /* sessiz — yöneticiye iletilir */ }
    finally { setBusy(false); setSent(true); }
  };

  if (sent) {
    return (
      <View style={{ flex: 1, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 }}>
        <PopIn style={{ width: 110, height: 110, borderRadius: 55, backgroundColor: C.warnBg, alignItems: 'center', justifyContent: 'center', borderWidth: 12, borderColor: '#fff' }}>
          <Icon name="clock" size={48} color={C.warn} />
        </PopIn>
        <FadeUp delay={60}><T v="h1" center style={{ marginTop: 26 }}>Talebiniz iletildi</T></FadeUp>
        <FadeUp delay={120}>
          <T v="body" color={C.ink2} center style={{ marginTop: 10, maxWidth: 290 }}>
            Şifre sıfırlama talebiniz yöneticinize iletildi. Yöneticiniz kimliğinizi doğrulayıp
            sizinle iletişime geçecek ve şifrenizi sıfırlayacak.
          </T>
        </FadeUp>
        <StatusChip status="warn" style={{ marginTop: 18 }}>İletildi · bekleniyor</StatusChip>
        <FadeUp delay={180} style={{ width: '100%' }}>
          <Button variant="primary" full height={56} label="Giriş ekranına dön" onPress={onBack} style={{ marginTop: 34 }} />
        </FadeUp>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.surface }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TopBar title="Şifremi unuttum" subtitle="Yönetici aracılığıyla sıfırlama" onBack={onBack} />
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 18, paddingBottom: 20 + insets.bottom }} keyboardShouldPersistTaps="handled">
        <T v="body" color={C.ink2}>
          Şifrenizi sıfırlamak için kimlik bilgilerinizi girin. Talebiniz yöneticinize iletilir;
          kimliğiniz doğrulandıktan sonra şifreniz sıfırlanır.
        </T>

        <FadeUp delay={60} style={{ marginTop: 24, gap: 16 }}>
          <TextField label="TC Kimlik No" value={tc} onChangeText={t => setTc(t.replace(/[^0-9]/g, ''))} placeholder="11 haneli numara" keyboardType="number-pad" maxLength={11} mono />
          <TextField label="Kayıtlı telefon" value={phone} onChangeText={t => setPhone(t.replace(/[^0-9]/g, ''))} placeholder="05XX XXX XX XX" keyboardType="phone-pad" maxLength={11} mono />
        </FadeUp>

        <View style={[S.cardFlat, { flexDirection: 'row', gap: 10, padding: 14, marginTop: 18, alignItems: 'flex-start' }]}>
          <Icon name="info" size={20} color={C.ink2} />
          <T v="cap" color={C.ink2} style={{ flex: 1, lineHeight: 18 }}>Güvenlik için şifre sıfırlama SMS ile değil, yöneticiniz tarafından yapılır.</T>
        </View>

        <View style={{ flex: 1 }} />

        <FadeUp delay={120}>
          <Button variant="primary" full height={56} label={busy ? 'Gönderiliyor…' : 'Sıfırlama talebi gönder'} onPress={canSubmit && !busy ? submit : undefined} style={canSubmit && !busy ? { marginTop: 18 } : { marginTop: 18, opacity: 0.45 }} />
        </FadeUp>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
