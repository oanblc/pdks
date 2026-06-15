// Login.tsx — Çalışan girişi: TC kimlik no + şifre
import React, { useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color as C } from '../../theme/tokens';
import { T, Button, TextField, RoundButton } from '../../components/ui';
import { FadeUp } from '../../components/anim';
import { Icon } from '../../components/Icon';
import { Brandmark } from '../Onboarding';
import { api, setToken, type Emp } from '../../api';
import { saveToken } from '../../lib/session';

export function Login({ onAuthed, onRegister, onForgot, onBack }:
  { onAuthed: (emp: Emp) => void; onRegister: () => void; onForgot: () => void; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const [tc, setTc] = useState('');
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canSubmit = tc.length === 11 && pw.length >= 1 && !busy;

  const submit = async () => {
    setBusy(true); setError(null);
    try {
      const { token, employee } = await api.login(tc, pw);
      setToken(token);
      saveToken(token); // arka plan hatırlatma görevinin /api/me doğrulaması için kalıcı
      onAuthed(employee);
    } catch (e: any) {
      setError(e.message || 'Giriş başarısız');
    } finally { setBusy(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.surface }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ paddingTop: 56, paddingHorizontal: 18 }}>
        <RoundButton icon="chevronL" onPress={onBack} />
      </View>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 20 + insets.bottom }} keyboardShouldPersistTaps="handled">
        <Brandmark size={52} />

        <FadeUp>
          <T v="h1" style={{ marginTop: 30 }}>Giriş yap</T>
          <T v="body" color={C.ink2} style={{ marginTop: 8 }}>TC kimlik numaranız ve şifrenizle hesabınıza girin.</T>
        </FadeUp>

        <FadeUp delay={60} style={{ marginTop: 26, gap: 16 }}>
          <TextField
            label="TC Kimlik No" value={tc} onChangeText={t => setTc(t.replace(/[^0-9]/g, ''))}
            placeholder="11 haneli numara" keyboardType="number-pad" maxLength={11} mono />
          <TextField
            label="Şifre" value={pw} onChangeText={setPw} placeholder="Şifreniz" secure={!show}
            rightSlot={
              <Pressable onPress={() => setShow(s => !s)} hitSlop={8}>
                <T v="sm" color={C.brand700}>{show ? 'Gizle' : 'Göster'}</T>
              </Pressable>
            } />
          <Pressable onPress={onForgot} hitSlop={6} style={{ alignSelf: 'flex-end' }}>
            <T v="sm" color={C.brand700}>Şifremi unuttum</T>
          </Pressable>
        </FadeUp>

        <View style={{ flex: 1 }} />

        {error && (
          <View style={{ flexDirection: 'row', gap: 10, padding: 13, borderRadius: 14, backgroundColor: C.errBg, borderWidth: 1, borderColor: C.errRing, marginBottom: 14, alignItems: 'center' }}>
            <Icon name="alert" size={18} color={C.err} />
            <T v="sm" color={C.errInk} style={{ flex: 1 }}>{error}</T>
          </View>
        )}

        <FadeUp delay={120}>
          <Button variant="primary" full height={56} label={busy ? 'Giriş yapılıyor…' : 'Giriş yap'} onPress={canSubmit ? submit : undefined} style={canSubmit ? undefined : { opacity: 0.45 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 18 }}>
            <T v="sm" color={C.ink2}>Hesabınız yok mu?</T>
            <Pressable onPress={onRegister} hitSlop={6}><T v="bodyS" color={C.brand700} style={{ fontSize: 14 }}>Kayıt olun</T></Pressable>
          </View>
        </FadeUp>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
