// KvkkSheet.tsx — KVKK Aydınlatma Metni (tam ekran popup). Kayıt/onboarding/profilden açılır.
import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { color as C, font } from '../theme/tokens';
import { Icon } from './Icon';
import { T, Button } from './ui';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 18 }}>
      <T v="bodyS" style={{ fontSize: 15, marginBottom: 6 }}>{title}</T>
      {children}
    </View>
  );
}
function P({ children }: { children: React.ReactNode }) {
  return <T v="sm" color={C.ink2} style={{ fontFamily: font.regular, lineHeight: 21 }}>{children}</T>;
}
function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
      <T v="sm" color={C.ink3}>•</T>
      <T v="sm" color={C.ink2} style={{ flex: 1, fontFamily: font.regular, lineHeight: 21 }}>{children}</T>
    </View>
  );
}

export function KvkkSheet({ onClose }: { onClose: () => void }) {
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.surface }}>
      <View style={{ paddingTop: 56, paddingHorizontal: 18, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <T v="h3">KVKK Aydınlatma Metni</T>
          <T v="cap" color={C.ink3} style={{ marginTop: 2 }}>Sürüm 2.1 · 14.04.2026</T>
        </View>
        <Pressable onPress={onClose} hitSlop={8} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="x" size={20} color={C.ink} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
        <P>
          İşbu metin, 6698 sayılı Kişisel Verilerin Korunması Kanunu (“KVKK”) m.10 uyarınca,
          çalışan giriş/çıkış (puantaj) sistemi kapsamında kişisel verilerinizin işlenmesine
          ilişkin sizi bilgilendirmek amacıyla hazırlanmıştır.
        </P>
        <View style={{ height: 16 }} />

        <Section title="1. Veri Sorumlusu">
          <P>İşvereniniz (şirket), KVKK kapsamında “veri sorumlusu” sıfatıyla hareket eder.</P>
        </Section>

        <Section title="2. İşlenen Kişisel Veriler">
          <Bullet>Kimlik: ad-soyad, T.C. kimlik numarası</Bullet>
          <Bullet>İletişim: telefon numarası, adres</Bullet>
          <Bullet>Özlük/çalışma: şube, departman, vardiya, sicil bilgisi</Bullet>
          <Bullet>İşlem güvenliği: giriş/çıkış ve mola zaman damgaları, cihaz bilgisi</Bullet>
          <Bullet>Görsel: tablette kimlik teyidi için profil fotoğrafı (sağladıysanız)</Bullet>
        </Section>

        <Section title="3. İşleme Amaçları">
          <Bullet>Çalışma sürelerinin ve fazla/eksik mesainin hesaplanması</Bullet>
          <Bullet>Bordro, özlük ve ücret süreçlerinin yürütülmesi</Bullet>
          <Bullet>İş Kanunu, SGK ve ilgili mevzuattan doğan yasal yükümlülüklerin yerine getirilmesi</Bullet>
          <Bullet>Giriş kayıtlarının doğruluğunun ve iş yeri güvenliğinin sağlanması</Bullet>
        </Section>

        <Section title="4. Hukuki Sebep">
          <P>
            Verileriniz; bir sözleşmenin (iş sözleşmesi) kurulması/ifası, veri sorumlusunun
            hukuki yükümlülüğünü yerine getirmesi ve meşru menfaati hukuki sebeplerine dayanılarak
            işlenir. Profil fotoğrafı gibi rızaya bağlı veriler yalnızca açık rızanızla işlenir.
          </P>
        </Section>

        <Section title="5. Toplama Yöntemi">
          <P>
            Verileriniz; mobil uygulama üzerinden tarafınızca girilen kayıt bilgileri ve şube
            tabletindeki QR kodun okutulmasıyla oluşan giriş/çıkış kayıtları aracılığıyla,
            elektronik ortamda toplanır. Konumunuz yalnızca okutma anında işlenir; sürekli konum
            takibi yapılmaz.
          </P>
        </Section>

        <Section title="6. Aktarım">
          <P>
            Verileriniz; yasal yükümlülükler kapsamında yetkili kamu kurumlarına (ör. SGK) ve
            bordro/İK hizmeti aldığımız iş ortaklarına, yalnızca ilgili amaçla sınırlı olarak ve
            gerekli güvenlik tedbirleriyle aktarılabilir.
          </P>
        </Section>

        <Section title="7. Saklama Süresi">
          <P>
            Verileriniz, ilgili mevzuatta öngörülen zamanaşımı ve saklama süreleri boyunca
            saklanır; bu sürelerin sonunda silinir, yok edilir veya anonim hâle getirilir.
          </P>
        </Section>

        <Section title="8. Haklarınız (KVKK m.11)">
          <Bullet>Verilerinizin işlenip işlenmediğini öğrenme ve buna ilişkin bilgi talep etme</Bullet>
          <Bullet>İşlenme amacını ve amaca uygun kullanılıp kullanılmadığını öğrenme</Bullet>
          <Bullet>Eksik/yanlış işlenen verilerin düzeltilmesini isteme</Bullet>
          <Bullet>Şartları oluştuğunda verilerin silinmesini/yok edilmesini isteme</Bullet>
          <Bullet>İşlemenin hukuka aykırı olması hâlinde zararın giderilmesini talep etme</Bullet>
        </Section>

        <Section title="9. Başvuru">
          <P>
            Haklarınıza ilişkin taleplerinizi, uygulama içindeki “Verilerime erişim talebi”
            bölümünden veya İK departmanı aracılığıyla iletebilirsiniz.
          </P>
        </Section>
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 30, borderTopWidth: 1, borderTopColor: C.border }}>
        <Button variant="primary" full height={54} label="Kapat" onPress={onClose} />
      </View>
    </View>
  );
}
