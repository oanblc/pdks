// Register.tsx — Çalışan kendi kaydını yapar → yönetici onayına düşer (gerçek API)
import React, { useEffect, useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, Pressable, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color as C, radius as R, font } from '../../theme/tokens';
import { Icon } from '../../components/Icon';
import { T, TopBar, Button, TextField, TextArea, FieldLabel, StatusChip, styles as S } from '../../components/ui';
import { FadeUp, PopIn } from '../../components/anim';
import { KvkkSheet } from '../../components/KvkkSheet';
import { api } from '../../api';

type Br = { id: number; name: string };

function BranchSheet({ branches, onPick, onClose }: { branches: Br[]; onPick: (b: Br) => void; onClose: () => void }) {
  return (
    <Pressable onPress={onClose} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(21,32,31,0.35)', justifyContent: 'flex-end' }}>
      <Pressable onPress={() => {}} style={{ backgroundColor: C.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingTop: 12, paddingBottom: 30, maxHeight: '72%' }}>
        <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: C.borderStrong, alignSelf: 'center', marginBottom: 12 }} />
        <T v="h3" style={{ paddingHorizontal: 20, paddingBottom: 8 }}>Şube seçin</T>
        <ScrollView>
          {branches.map((b, i) => (
            <Pressable key={b.id} onPress={() => onPick(b)} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 20, paddingVertical: 15, borderTopWidth: i ? 1 : 0, borderTopColor: C.border }, pressed && { backgroundColor: C.surface2 }]}>
              <View style={{ width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: C.brand50 }}><Icon name="building" size={19} color={C.brand700} /></View>
              <T v="body" style={{ flex: 1 }}>{b.name}</T>
              <Icon name="chevron" size={18} color={C.ink3} />
            </Pressable>
          ))}
        </ScrollView>
      </Pressable>
    </Pressable>
  );
}

// TC kimlik no algoritmik doğrulaması (backend ile aynı kural)
function isValidTC(tc: string): boolean {
  if (!/^\d{11}$/.test(tc) || tc[0] === '0') return false;
  const d = tc.split('').map(Number);
  const odd = d[0] + d[2] + d[4] + d[6] + d[8];
  const even = d[1] + d[3] + d[5] + d[7];
  if (((odd * 7 - even) % 10 + 10) % 10 !== d[9]) return false;
  return d.slice(0, 10).reduce((a, b) => a + b, 0) % 10 === d[10];
}

export function Register({ onSubmitted, onBack }: { onSubmitted: () => void; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const [ad, setAd] = useState('');
  const [soyad, setSoyad] = useState('');
  const [tc, setTc] = useState('');
  const [phone, setPhone] = useState('');
  const [branch, setBranch] = useState<Br | null>(null);
  const [adres, setAdres] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [show, setShow] = useState(false);
  const [picker, setPicker] = useState(false);
  const [kvkk, setKvkk] = useState(false);
  const [branches, setBranches] = useState<Br[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { api.branches().then(setBranches).catch(() => {}); }, []);

  const mismatch = pw2.length > 0 && pw !== pw2;
  const canSubmit = !!(ad.trim() && soyad.trim() && tc.length === 11 && phone.length >= 10 && branch && adres.trim() && pw.length >= 4 && pw === pw2) && !busy;

  const submit = async () => {
    if (!isValidTC(tc)) { setError('Geçersiz TC kimlik numarası.'); return; }
    if (!/^0?5\d{9}$/.test(phone)) { setError('Telefon 05XX ile başlayan 11 hane olmalı.'); return; }
    setBusy(true); setError(null);
    try {
      await api.register({ tc, name: `${ad.trim()} ${soyad.trim()}`, phone, address: adres, branchId: branch!.id, password: pw });
      onSubmitted();
    } catch (e: any) {
      setError(e.message || 'Kayıt başarısız');
    } finally { setBusy(false); }
  };

  const ShowBtn = (
    <Pressable onPress={() => setShow(s => !s)} hitSlop={8}><T v="sm" color={C.brand700}>{show ? 'Gizle' : 'Göster'}</T></Pressable>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.surface }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TopBar title="Kayıt ol" subtitle="Bilgileriniz yönetici onayına gönderilir" onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: 22, paddingBottom: 24 + insets.bottom }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 16 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}><TextField label="Ad" value={ad} onChangeText={setAd} placeholder="Adınız" /></View>
            <View style={{ flex: 1 }}><TextField label="Soyad" value={soyad} onChangeText={setSoyad} placeholder="Soyadınız" /></View>
          </View>
          <TextField label="TC Kimlik No" value={tc} onChangeText={t => setTc(t.replace(/[^0-9]/g, ''))} placeholder="11 haneli numara" keyboardType="number-pad" maxLength={11} mono />
          <TextField label="Telefon" value={phone} onChangeText={t => setPhone(t.replace(/[^0-9]/g, ''))} placeholder="05XX XXX XX XX" keyboardType="phone-pad" maxLength={11} mono />

          <View>
            <FieldLabel>Şube</FieldLabel>
            <Pressable onPress={() => setPicker(true)} style={{ height: 52, borderRadius: R.md, borderWidth: 1.5, borderColor: C.borderStrong, backgroundColor: C.surface, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <T v="body" color={branch ? C.ink : C.ink3}>{branch ? branch.name : 'Şubenizi seçin'}</T>
              <Icon name="chevronDown" size={18} color={C.ink3} />
            </Pressable>
          </View>

          <View><FieldLabel>Adres</FieldLabel><TextArea placeholder="Açık adresiniz" value={adres} onChangeText={setAdres} /></View>

          <TextField label="Şifre" value={pw} onChangeText={setPw} placeholder="En az 4 karakter" secure={!show} rightSlot={ShowBtn} />
          <View>
            <TextField label="Şifre (tekrar)" value={pw2} onChangeText={setPw2} placeholder="Şifrenizi tekrar girin" secure={!show} />
            {mismatch && <T v="cap" color={C.errInk} style={{ marginTop: 6 }}>Şifreler eşleşmiyor.</T>}
          </View>
        </View>

        <View style={[S.cardFlat, { flexDirection: 'row', gap: 10, padding: 14, marginTop: 18, alignItems: 'flex-start' }]}>
          <Icon name="shield" size={20} color={C.ink2} />
          <T v="cap" color={C.ink2} style={{ flex: 1, lineHeight: 18 }}>
            Kaydolarak bilgilerinizin{' '}
            <Text onPress={() => setKvkk(true)} style={{ color: C.brand700, fontFamily: font.semibold, textDecorationLine: 'underline' }}>KVKK aydınlatma metni</Text>
            {' '}kapsamında işlenmesini kabul edersiniz.
          </T>
        </View>

        {error && (
          <View style={{ flexDirection: 'row', gap: 10, padding: 13, borderRadius: 14, backgroundColor: C.errBg, borderWidth: 1, borderColor: C.errRing, marginTop: 14, alignItems: 'center' }}>
            <Icon name="alert" size={18} color={C.err} />
            <T v="sm" color={C.errInk} style={{ flex: 1 }}>{error}</T>
          </View>
        )}

        <Button variant="primary" full height={56} label={busy ? 'Gönderiliyor…' : 'Başvuruyu gönder'} onPress={canSubmit ? submit : undefined} style={[{ marginTop: 18 }, canSubmit ? undefined : { opacity: 0.45 }]} />
      </ScrollView>

      {picker && <BranchSheet branches={branches} onPick={b => { setBranch(b); setPicker(false); }} onClose={() => setPicker(false)} />}
      {kvkk && <KvkkSheet onClose={() => setKvkk(false)} />}
    </KeyboardAvoidingView>
  );
}

export function RegisterPending({ onDone }: { onDone: () => void }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 }}>
      <PopIn style={{ width: 110, height: 110, borderRadius: 55, backgroundColor: C.warnBg, alignItems: 'center', justifyContent: 'center', borderWidth: 12, borderColor: '#fff' }}>
        <Icon name="clock" size={48} color={C.warn} />
      </PopIn>
      <FadeUp delay={60}><T v="h1" center style={{ marginTop: 26 }}>Başvurunuz alındı</T></FadeUp>
      <FadeUp delay={120}>
        <T v="body" color={C.ink2} center style={{ marginTop: 10, maxWidth: 290 }}>
          Yöneticiniz kaydınızı inceleyecek. Onaylandığında TC kimlik numaranız ve belirlediğiniz şifreyle giriş yapabilirsiniz.
        </T>
      </FadeUp>
      <StatusChip status="warn" style={{ marginTop: 18 }}>Onay bekliyor</StatusChip>
      <FadeUp delay={180} style={{ width: '100%' }}>
        <Button variant="primary" full height={56} label="Giriş ekranına dön" onPress={onDone} style={{ marginTop: 34 }} />
      </FadeUp>
    </View>
  );
}
