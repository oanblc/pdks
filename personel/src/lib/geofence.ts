// geofence.ts — arka plan coğrafi sınır (şube) izleme.
// Görev modül yüklenirken tanımlanır; App giriş noktasında import edilmelidir.
// Uygulama kapalıyken bile şubeye giriş/çıkış olaylarını alır (EAS build gerekir).
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { loadReminderCtx, loadToken, type ReminderCtx, type Geo } from './session';
import { presentNow, scheduleAt, cancel, REMINDER_IDS } from './notify';
import { API_BASE } from '../api';

export const GEOFENCE_TASK = 'pdks-branch-geofence';

// Çevrimdışı fallback'te son bilinen durum en fazla bu kadar eski olabilir (12 saat) — bayat veriyle yanlış alarm önlenir.
const LAST_STATUS_MAX_AGE = 12 * 3600 * 1000;

TaskManager.defineTask(GEOFENCE_TASK, async ({ data, error }: any) => {
  if (error) return;
  const eventType = data?.eventType as Location.GeofencingEventType;
  const ctx = await loadReminderCtx();
  if (!ctx) return;

  if (eventType === Location.GeofencingEventType.Enter) {
    // Geç giriş: vardiya başlangıcı (backend mutlak zamanı) + tolerans için bildirim planla.
    // Çalışan giriş okutursa ön plan motoru bunu iptal eder.
    const startMs = ctx.shiftStartAt ? Date.parse(ctx.shiftStartAt) : NaN;
    if (!isNaN(startMs)) {
      const when = startMs + ctx.lateToleranceMin * 60000;
      if (when > Date.now()) {
        await scheduleAt(REMINDER_IDS.lateIn, new Date(when), 'Giriş okutmadın', 'Vardiyan başladı ve şubedesin ama giriş okutmadın. Lütfen giriş okut.');
      }
    }
  } else if (eventType === Location.GeofencingEventType.Exit) {
    await cancel(REMINDER_IDS.lateIn); // şubeden çıktıysa geç-giriş hatırlatması anlamsız
    // Eksik çıkış: vardiya bitişini geçtiyse ve hâlâ çıkış yoksa uyar.
    const endMs = ctx.shiftEndAt ? Date.parse(ctx.shiftEndAt) : NaN;
    if (!isNaN(endMs) && Date.now() >= endMs && (await isStillClockedIn(ctx))) {
      await presentNow('Çıkış okutmadın', 'İşletmeden ayrıldın ama çıkış okutmadın. Puantajın eksik kalmasın, çıkış okut.', REMINDER_IDS.missingExit);
    }
  }
});

// Önce sunucudan doğrula (kioskla/manuel çıkış edge'leri); ulaşılamazsa YALNIZCA yeterince taze son duruma düş.
async function isStillClockedIn(ctx: ReminderCtx): Promise<boolean> {
  try {
    const token = await loadToken();
    if (token) {
      const res = await fetch(API_BASE + '/api/me', { headers: { authorization: `Bearer ${token}` } });
      if (res.ok) {
        const d = await res.json();
        return !!d?.today?.status && d.today.status !== 'outside';
      }
    }
  } catch { /* çevrimdışı → fallback */ }
  // Backend'e ulaşılamadı → son bilinen durum yeterince taze ise ona göre karar ver (bayatsa alarm verme)
  const fresh = ctx.lastStatusAt != null && (Date.now() - ctx.lastStatusAt) <= LAST_STATUS_MAX_AGE;
  return fresh && !!ctx.lastStatus && ctx.lastStatus !== 'outside';
}

export async function startBranchGeofence(geo: Geo | null) {
  try {
    if (!geo) return;
    const bg = await Location.getBackgroundPermissionsAsync();
    if (bg.status !== 'granted') return; // arka plan izni yoksa sessizce geç
    await stopBranchGeofence();
    await Location.startGeofencingAsync(GEOFENCE_TASK, [{
      latitude: geo.lat, longitude: geo.lng, radius: geo.radius || 100,
      notifyOnEnter: true, notifyOnExit: true,
    }]);
  } catch { /* yoksay */ }
}

export async function stopBranchGeofence() {
  try {
    if (await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK)) {
      await Location.stopGeofencingAsync(GEOFENCE_TASK);
    }
  } catch { /* yoksay */ }
}
