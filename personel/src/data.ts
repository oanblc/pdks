// data.ts — örnek/seed veri (prototip)
export type Status = 'outside' | 'inside' | 'break';

// Okutma eylemleri — giriş/çıkış + mola çıkış/dönüş (hepsi QR ile)
export type Action = 'enter' | 'exit' | 'break-out' | 'break-in';

export const ACTION: Record<Action, {
  scanTitle: string; okTitle: string; queuedTitle: string; chipLabel: string; chipTone: 'ok' | 'warn' | 'neu';
}> = {
  enter: { scanTitle: 'Giriş', okTitle: 'GİRİŞ KAYDEDİLDİ', queuedTitle: 'GİRİŞ ALINDI', chipLabel: 'İçeridesiniz', chipTone: 'ok' },
  exit: { scanTitle: 'Çıkış', okTitle: 'ÇIKIŞ KAYDEDİLDİ', queuedTitle: 'ÇIKIŞ ALINDI', chipLabel: 'Dışarıdasınız', chipTone: 'neu' },
  'break-out': { scanTitle: 'Molaya çıkış', okTitle: 'MOLAYA ÇIKILDI', queuedTitle: 'MOLA ALINDI', chipLabel: 'Molada', chipTone: 'warn' },
  'break-in': { scanTitle: 'Moladan dönüş', okTitle: 'MOLADAN DÖNÜLDÜ', queuedTitle: 'DÖNÜŞ ALINDI', chipLabel: 'İçeridesiniz', chipTone: 'ok' },
};

export const EMPLOYEE = {
  name: 'Ayşe Yıldırım',
  role: 'Kasiyer',
  branch: 'Merkez Şube',
  dept: 'Satış',
  shift: '09:00 – 18:00',
  startDate: null as string | null,
  isManager: false,
  kioskCode: null as string | null,
  avatar: null as string | null,
  id: '10428',
};

export function nowHM(): string {
  return new Date().toTimeString().slice(0, 5);
}

// Kayıt sırasında çalışanın seçebileceği şubeler (21 şube)
export const BRANCHES = [
  'Merkez Şube', 'AVM Mağaza A', 'AVM Mağaza B', 'AVM Mağaza C', 'Cadde Mağazası',
  'Outlet Mağaza', 'Showroom', 'Plaza Mağaza', 'Ana Depo', 'Depo 2 (Soğuk Hava)',
  'Üretim Tesisi', 'Servis Noktası', 'Kargo / Sevkiyat', 'Saha / Lojistik', 'Bölge Ofisi',
  'Taşra Şube 1', 'Taşra Şube 2', 'Taşra Şube 3', 'Taşra Şube 4', 'Taşra Şube 5', 'Taşra Şube 6',
];
