# PDKS — Çalışan Personel Devam Kontrol Sistemi

Türkçe çalışan giriş-çıkış (puantaj) sistemi. Üç parça tek bir backend'i paylaşır:

| Klasör | Teknoloji | Açıklama |
|--------|-----------|----------|
| [`personel`](./personel) | React Native + Expo (SDK 54) | Mobil uygulama — çalışan (QR giriş-çıkış, izin/düzeltme talepleri, hatırlatmalar) ve kiosk/şube modu |
| [`personel-web`](./personel-web) | React + Vite + TypeScript | Yönetici paneli — çalışanlar, şubeler, vardiyalar, puantaj, talep onayları, güvenlik/risk, KVKK |
| [`personel-backend`](./personel-backend) | Node + Fastify + Prisma + SQLite | Ortak API — kimlik doğrulama, punch, puantaj hesabı, geofence, talep akışı |

## Öne çıkan özellikler
- **Geofence + cihaz bazlı QR okutma** (şube konumu + yarıçapı)
- **Akıllı hatırlatmalar** (mobil): geç giriş, eksik çıkış (arka plan geofence), mola aşımı
- **Şube yetkilisi + günlük kiosk kodu** (her gün otomatik değişen, deterministik PIN)
- **İzin akışı** (müdür görüşü → admin onayı, SLA eskalasyonu), onaylı izin günü puantaja işlenir
- **Risk skoru / anomali**, **KVKK/DSAR**, denetim kaydı

## Geliştirme

### Backend
```bash
cd personel-backend
npm install
cp .env.example .env        # JWT_SECRET vb. doldurun
npx prisma db push
npm run seed                # demo veri
npm run dev                 # TZ=Europe/Istanbul ile :4000
```
Demo giriş: admin `admin@firma.com / admin123` · çalışan TC `11111111111 / 1234`

### Web paneli
```bash
cd personel-web
npm install
npm run dev
```

### Mobil
```bash
cd personel
npm install
# API adresi: EXPO_PUBLIC_API_URL (verilmezse geliştirme LAN IP'sine düşer)
npx expo run:ios   # arka plan geofence/bildirim için EAS/dev build gerekir (Expo Go değil)
```

## Notlar
- `.env`, `node_modules`, `ios/`, `dist/`, `*.db` sürüm kontrolüne dahil değildir (bkz. `.gitignore`).
- Üretimde: `JWT_SECRET` zorunlu, `ALLOWED_ORIGINS` ile CORS kısıtlanır, mobil `EXPO_PUBLIC_API_URL` gerçek API adresine ayarlanır.
