// reminders.ts — ön plan hatırlatma motoru.
// api.me() sonrası ve her punch sonrası çağrılır: zamanlı bildirimleri planlar/iptal eder,
// koşul zaten doluysa anlık banner döndürür. Arka plan görevi için bağlamı da kaydeder.
// Vardiya zamanları backend'den MUTLAK (ISO) gelir — istemcide saat dilimi/gece-vardiyası hesabı yapılmaz.
import { distanceMeters } from './geo';
import { scheduleAt, cancel, presentNow, REMINDER_IDS } from './notify';
import { saveReminderCtx, type Geo } from './session';
import { API_BASE } from '../api';

export type ReminderKey = 'breakOver' | 'lateIn' | 'missingExit' | 'shiftEnd';
export type ReminderBanner = { key: ReminderKey; title: string; body: string; tone: 'warn' | 'err' | 'neu' | 'ok'; icon: string };

// Kullanıcının elle kapattığı hatırlatmalar — koşul değişene (ör. giriş okutulana) kadar tekrar gösterilmez.
const dismissed = new Set<ReminderKey>();
export function dismissReminder(key: ReminderKey) { dismissed.add(key); }

export type ReminderInput = {
  status: 'outside' | 'inside' | 'break';
  breakStartMs: number | null;
  shiftStartAt: string | null; // ISO (backend)
  shiftEndAt: string | null;   // ISO (backend)
  breakMin: number | null;
  lateToleranceMin: number;
  branchGeo: Geo | null;
  coords?: { lat: number; lng: number } | null; // ön plan konumu (varsa)
};

// Arka plan görevinin okuyacağı bağlamı kalıcı yaz (lastStatus zaman damgalı — bayat veriye güvenmemek için).
export async function persistReminderCtx(i: ReminderInput) {
  await saveReminderCtx({
    apiBase: API_BASE,
    shiftStartAt: i.shiftStartAt, shiftEndAt: i.shiftEndAt, breakMin: i.breakMin,
    lateToleranceMin: i.lateToleranceMin, branchGeo: i.branchGeo,
    lastStatus: i.status, lastStatusAt: Date.now(),
  });
}

const insideBranch = (i: ReminderInput): boolean | null => {
  if (!i.branchGeo || !i.coords) return null; // bilinmiyor
  return distanceMeters(i.coords, { lat: i.branchGeo.lat, lng: i.branchGeo.lng }) <= (i.branchGeo.radius || 100);
};

// Eksik çıkış bildirimini ön planda bir kez göster (tekrar tekrar göstermeyi önler)
let missingExitNotified = false;

// Hatırlatmaları güncelle; anında gösterilecek bir banner varsa döndür.
export async function syncReminders(i: ReminderInput): Promise<ReminderBanner | null> {
  await persistReminderCtx(i);
  let banner: ReminderBanner | null = null;
  const now = Date.now();

  // 1) Mola aşımı — tamamen zaman bazlı
  if (i.status === 'break' && i.breakStartMs && i.breakMin && i.breakMin > 0) {
    const when = i.breakStartMs + i.breakMin * 60000;
    if (now >= when) {
      if (!dismissed.has('breakOver')) banner = { key: 'breakOver', title: 'Mola süresi doldu', body: `${i.breakMin} dakikalık molan doldu. Okutup işe devam et.`, tone: 'warn', icon: 'clock' };
      await cancel(REMINDER_IDS.breakOver);
    } else {
      dismissed.delete('breakOver'); // henüz dolmadı → bir sonraki dolumda yeniden gösterilebilsin
      await scheduleAt(REMINDER_IDS.breakOver, new Date(when), 'Mola süresi doldu', `${i.breakMin} dakikalık molan doldu. Okutup işe devam et.`);
    }
  } else {
    dismissed.delete('breakOver');
    await cancel(REMINDER_IDS.breakOver);
  }

  // 2) Geç giriş — şube içinde + giriş yok (vardiya başlangıcı backend mutlak zamanı)
  const startMs = i.shiftStartAt ? Date.parse(i.shiftStartAt) : NaN;
  if (i.status === 'outside' && !isNaN(startMs) && insideBranch(i) === true) {
    const when = startMs + i.lateToleranceMin * 60000;
    if (now >= when) {
      if (!banner && !dismissed.has('lateIn')) banner = { key: 'lateIn', title: 'Giriş okutmadın', body: 'Vardiyan başladı ve şubedesin ama giriş okutmadın. Lütfen giriş okut.', tone: 'warn', icon: 'bell' };
      await cancel(REMINDER_IDS.lateIn);
    } else {
      dismissed.delete('lateIn');
      await scheduleAt(REMINDER_IDS.lateIn, new Date(when), 'Giriş okutmadın', 'Vardiyan başladı ve şubedesin ama giriş okutmadın. Lütfen giriş okut.');
    }
  } else {
    dismissed.delete('lateIn'); // giriş okutuldu / şubeden ayrıldı → koşul kalktı, hafıza sıfırlanır
    await cancel(REMINDER_IDS.lateIn);
  }

  // 3) Eksik çıkış — vardiya bitti, hâlâ giriş açık (vardiya bitişi backend mutlak zamanı)
  const endMs = i.shiftEndAt ? Date.parse(i.shiftEndAt) : NaN;
  if (i.status !== 'outside' && !isNaN(endMs) && now >= endMs) {
    if (insideBranch(i) === false) {
      // İşletme dışında + çıkış okutulmamış → gerçek eksik çıkış (ön plan güvenlik ağı; arka plan geofence olayını tamamlar)
      if (!dismissed.has('missingExit')) banner = { key: 'missingExit', title: 'Çıkış okutmadın', body: 'İşletmeden ayrıldın ama çıkış okutmadın. Puantajın eksik kalmasın, çıkış okut.', tone: 'warn', icon: 'bell' };
      if (!missingExitNotified) { await presentNow('Çıkış okutmadın', 'İşletmeden ayrıldın ama çıkış okutmadın. Puantajın eksik kalmasın, çıkış okut.', REMINDER_IDS.missingExit); missingExitNotified = true; }
    } else {
      // Hâlâ işletmedeyse nazik hatırlatma
      if (!banner && !dismissed.has('shiftEnd')) banner = { key: 'shiftEnd', title: 'Vardiyan bitti', body: 'Vardiya bitiş saatini geçtin. Çıkış okutmayı unutma.', tone: 'neu', icon: 'bell' };
      missingExitNotified = false;
    }
  } else {
    dismissed.delete('missingExit'); dismissed.delete('shiftEnd'); // çıkış okutuldu / vardiya bitmedi → hafıza sıfırlanır
    missingExitNotified = false;
  }

  return banner;
}

// Çıkış yapıldığında / oturum kapandığında / 401'de tüm hatırlatmaları temizle.
export async function clearAllReminders() {
  missingExitNotified = false; // kullanıcı değişiminde bayrak sıfırlanır (aksi halde eksik-çıkış takılır)
  dismissed.clear();
  await cancel(REMINDER_IDS.breakOver);
  await cancel(REMINDER_IDS.lateIn);
  await cancel(REMINDER_IDS.missingExit);
}
