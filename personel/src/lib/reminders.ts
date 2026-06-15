// reminders.ts — ön plan hatırlatma motoru.
// api.me() sonrası ve her punch sonrası çağrılır: zamanlı bildirimleri planlar/iptal eder,
// koşul zaten doluysa anlık banner döndürür. Arka plan görevi için bağlamı da kaydeder.
import { distanceMeters } from './geo';
import { scheduleAt, cancel, presentNow, REMINDER_IDS } from './notify';
import { saveReminderCtx, type Geo } from './session';
import { shiftStartDate, shiftEndDate, addMinutes } from './shiftTime';
import { API_BASE } from '../api';

export type ReminderBanner = { title: string; body: string; tone: 'warn' | 'err' | 'neu' | 'ok'; icon: string };

export type ReminderInput = {
  status: 'outside' | 'inside' | 'break';
  breakStartMs: number | null;
  shiftStart: string | null;
  shiftEnd: string | null;
  breakMin: number | null;
  overnight: boolean;
  lateToleranceMin: number;
  branchGeo: Geo | null;
  coords?: { lat: number; lng: number } | null; // ön plan konumu (varsa)
};

// Arka plan görevinin okuyacağı bağlamı kalıcı yaz.
export async function persistReminderCtx(i: ReminderInput) {
  await saveReminderCtx({
    apiBase: API_BASE,
    shiftStart: i.shiftStart, shiftEnd: i.shiftEnd, breakMin: i.breakMin,
    overnight: i.overnight, lateToleranceMin: i.lateToleranceMin, branchGeo: i.branchGeo,
    lastStatus: i.status,
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
      banner = { title: 'Mola süresi doldu', body: `${i.breakMin} dakikalık molan doldu. Okutup işe devam et.`, tone: 'warn', icon: 'clock' };
      await cancel(REMINDER_IDS.breakOver);
    } else {
      await scheduleAt(REMINDER_IDS.breakOver, new Date(when), 'Mola süresi doldu', `${i.breakMin} dakikalık molan doldu. Okutup işe devam et.`);
    }
  } else {
    await cancel(REMINDER_IDS.breakOver);
  }

  // 2) Geç giriş — şube içinde + giriş yok
  const start = shiftStartDate(i.shiftStart);
  if (i.status === 'outside' && start && insideBranch(i) === true) {
    const when = addMinutes(start, i.lateToleranceMin);
    if (now >= when.getTime()) {
      banner = banner ?? { title: 'Giriş okutmadın', body: 'Vardiyan başladı ve şubedesin ama giriş okutmadın. Lütfen giriş okut.', tone: 'warn', icon: 'bell' };
      await cancel(REMINDER_IDS.lateIn);
    } else {
      await scheduleAt(REMINDER_IDS.lateIn, when, 'Giriş okutmadın', 'Vardiyan başladı ve şubedesin ama giriş okutmadın. Lütfen giriş okut.');
    }
  } else {
    await cancel(REMINDER_IDS.lateIn);
  }

  // 3) Eksik çıkış — vardiya bitti, hâlâ giriş açık
  const end = shiftEndDate(i.shiftStart, i.shiftEnd, i.overnight);
  if (i.status !== 'outside' && end && now >= end.getTime()) {
    if (insideBranch(i) === false) {
      // İşletme dışında + çıkış okutulmamış → gerçek eksik çıkış (ön plan güvenlik ağı; arka plan geofence olayını tamamlar)
      const b = { title: 'Çıkış okutmadın', body: 'İşletmeden ayrıldın ama çıkış okutmadın. Puantajın eksik kalmasın, çıkış okut.', tone: 'warn' as const, icon: 'bell' };
      banner = b;
      if (!missingExitNotified) { await presentNow(b.title, b.body, REMINDER_IDS.missingExit); missingExitNotified = true; }
    } else {
      // Hâlâ işletmedeyse nazik hatırlatma
      banner = banner ?? { title: 'Vardiyan bitti', body: 'Vardiya bitiş saatini geçtin. Çıkış okutmayı unutma.', tone: 'neu', icon: 'bell' };
      missingExitNotified = false;
    }
  } else {
    missingExitNotified = false;
  }

  return banner;
}

// Çıkış yapıldığında / oturum kapandığında tüm hatırlatmaları temizle.
export async function clearAllReminders() {
  await cancel(REMINDER_IDS.breakOver);
  await cancel(REMINDER_IDS.lateIn);
  await cancel(REMINDER_IDS.missingExit);
}
