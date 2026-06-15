// geofence.ts — arka plan coğrafi sınır (şube) izleme.
// Görev modül yüklenirken tanımlanır; App giriş noktasında import edilmelidir.
// Uygulama kapalıyken bile şubeye giriş/çıkış olaylarını alır (EAS build gerekir).
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { loadReminderCtx, loadToken, type Geo } from './session';
import { presentNow, scheduleAt, cancel, REMINDER_IDS } from './notify';
import { shiftStartDate, shiftEndDate, addMinutes } from './shiftTime';
import { API_BASE } from '../api';

export const GEOFENCE_TASK = 'pdks-branch-geofence';

TaskManager.defineTask(GEOFENCE_TASK, async ({ data, error }: any) => {
  if (error) return;
  const eventType = data?.eventType as Location.GeofencingEventType;
  const ctx = await loadReminderCtx();
  if (!ctx) return;

  if (eventType === Location.GeofencingEventType.Enter) {
    // Geç giriş: vardiya başlangıcı + tolerans için bildirim planla.
    // Çalışan giriş okutursa ön plan motoru bunu iptal eder.
    const start = shiftStartDate(ctx.shiftStart);
    if (start) {
      const when = addMinutes(start, ctx.lateToleranceMin);
      if (when.getTime() > Date.now()) {
        await scheduleAt(REMINDER_IDS.lateIn, when, 'Giriş okutmadın', 'Vardiyan başladı ve şubedesin ama giriş okutmadın. Lütfen giriş okut.');
      }
    }
  } else if (eventType === Location.GeofencingEventType.Exit) {
    await cancel(REMINDER_IDS.lateIn); // şubeden çıktıysa geç-giriş hatırlatması anlamsız
    // Eksik çıkış: vardiya bitişini geçtiyse ve hâlâ çıkış yoksa uyar.
    const end = shiftEndDate(ctx.shiftStart, ctx.shiftEnd, ctx.overnight);
    if (end && Date.now() >= end.getTime() && (await isStillClockedIn(ctx.lastStatus))) {
      await presentNow('Çıkış okutmadın', 'İşletmeden ayrıldın ama çıkış okutmadın. Puantajın eksik kalmasın, çıkış okut.', REMINDER_IDS.missingExit);
    }
  }
});

// Önce sunucudan doğrula (kioskla/manuel çıkış edge'leri); ulaşılamazsa son bilinen duruma düş.
async function isStillClockedIn(lastStatus?: string): Promise<boolean> {
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
  // Backend'e ulaşılamadı (örn. şubeden/WiFi'den çıkıldı) → son bilinen duruma göre karar ver
  return !!lastStatus && lastStatus !== 'outside';
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
