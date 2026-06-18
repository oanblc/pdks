# PDKS — Proje Durumu (özet)

Personel Devam Kontrol Sistemi. Bu doküman, şu ana kadar yapılanları ve sıradaki
adımları özetler; geliştirmeye buradan devam edilebilir.

## Mimari
- **Backend**: Node + Fastify + Prisma + SQLite, `tsx` ile çalışır (build adımı yok).
  `personel-backend/src/server.ts` (tek dosya), şema `personel-backend/prisma/schema.prisma`.
- **Web panel**: React + Vite + TypeScript — `personel-web/`. Tasarım `src/design-system.css`,
  paylaşılan bileşenler `src/ui.tsx`, ekranlar `src/screens/`.
- **Mobil**: React Native + Expo (SDK 54) — `personel/`. Çalışan + kiosk modları.
- **Canlı**: `http://70.40.138.246` (nginx web `dist`'i sunar, `/api` → :4000 pm2 `pdks-api`).
- **Deploy**: GitHub'a push → sunucuda `git reset --hard origin/main`, gerekiyorsa
  `npx prisma db push && npx prisma generate`, `personel-web` build, `pm2 restart pdks-api`.
- **Test giriş bilgileri**: `personel-backend/prisma/seed.ts` içinde (admin / çalışan / şube).

## Yapılanlar
- **Web panel yeniden tasarım**: mavi/kompakt SaaS arayüz (token tabanlı design-system).
- **Çalışan yönetimi**: işe giriş tarihi alanı; çalışan detay sayfası (popup değil tam sayfa).
- **KVKK**: aydınlatma metni sürümleme + onay tarihi + ilgili kişi (DSAR) talepleri.
- **Kiosk PIN modeli**: statik şube PIN'i ile yönetici inceleme; şube parolasıyla güvenli çıkış
  (kilitlenme/kısır döngü giderildi). Numerik tuş takımları, kompakt kiosk başlığı.
- **Profil fotoğrafı**: mobilde ekle/kaldır; kioskta okutmada ve web panelde görünür.
- **Puantaj ekranı**: takvim çizelgesi öne + açık; çalışan tablosu katlanır.
- **Mobil hatırlatmalar**: "giriş/çıkış okutmadın", "mola doldu" — kapatılan banner koşul
  değişene kadar tekrar gelmez.
- **Performans değerlendirmesi (yıllık)**: özelleştirilebilir kriterler (kılık, müşteri iletişimi,
  satış, kasa/altın doğruluğu vb. — kuyumculuk setine ayarlı) + puantajdan otomatik "Devam &
  dakiklik" skoru; 1–5 yıldız → ağırlıklı genel skor. Modeller: `Evaluation`.
- **Değerlendirme dönemleri (kiosk müdür akışı)**: İK tarih aralığı + kriter + şube seçip dönem
  açar; o tarihlerde şube yöneticisi kioskta çalışanları birebir yıldızla puanlar; puanlar İK'ya
  **taslak** düşer, yayınlamayı İK yapar. Modeller: `EvalCampaign`, `EvalCampaignEntry`.
- **Mobil-uyumlu panel**: dar ekranda kenar çubuğu hamburger çekmecesi; istatistik kartları
  2'li; **tablolar kart görünümüne** döner (paylaşılan `Table/Row` responsive); filtre çubukları,
  sayfa başlığı eylemleri sarmalanır.
- **Duyurular / bildirim**: panelden tüm çalışanlara (veya bir şubeye) duyuru. Kalıcı `Announcement`
  kaydı → uygulama-içi banner + "Bildirimler" listesi; ayrıca cihaz token'larına **Expo push**.
  Modeller: `Announcement`, `PushToken`. (Uygulama-içi kısım çalışıyor; gerçek OS push için aşağıya bak.)
- **Sunum**: `~/Desktop/puanto-sunum/` — panel + mobil + QR/kiosk slaytları.

## Sıradaki adımlar (sonraki oturum)
- **Gerçek telefon push'u (iOS, fiziksel cihaz)**: kod hazır; eksik olan yalnız EAS kurulumu —
  1) `eas login` → `eas init` (app.json'a `extra.eas.projectId`),
  2) `app.json` `ios.bundleIdentifier` + `eas.json` development profili,
  3) `eas device:create` (iPhone'u kaydet),
  4) `eas build --platform ios --profile development` (Apple kimliklerini EAS üretir),
  5) iPhone'a kur → `npx expo start --dev-client` → app açılışta push token kaydolur,
  6) panelden duyuru → telefon çalar. (Android emülatör de FCM ile çalışır.)
- Push tıklanınca "Bildirimler" ekranına yönlendirme (notification response listener) eklenebilir.

## Notlar
- Mobil app canlı API'ye `EXPO_PUBLIC_API_URL=http://70.40.138.246 npx expo start` ile bağlanır.
- Expo Go'da: uygulama-içi duyuru + banner çalışır; **gerçek OS push çalışmaz** (dev build gerekir).
