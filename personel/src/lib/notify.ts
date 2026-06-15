// notify.ts — yerel bildirim altyapısı (hatırlatmalar için).
// Zamanlı bildirimler uygulama kapalı/arka plandayken de tetiklenir (EAS build gerekir).
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Sabit kimlikler — yeniden planlamada eskisi iptal edilir, çoğalma olmaz.
export const REMINDER_IDS = {
  lateIn: 'reminder-late-in',
  breakOver: 'reminder-break-over',
  missingExit: 'reminder-missing-exit',
} as const;

let initialized = false;

// Uygulama açılışında bir kez çağrılır: handler + Android kanalı.
export async function initNotifications() {
  if (initialized) return;
  initialized = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Hatırlatmalar',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    }).catch(() => {});
  }
}

export async function ensureNotifPermission(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.status === 'granted';
}

// Belirli bir zamana bildirim planla (geçmiş/çok yakınsa hemen göster).
export async function scheduleAt(id: string, when: Date, title: string, body: string) {
  await cancel(id);
  const ms = when.getTime() - Date.now();
  if (ms <= 1000) { await presentNow(title, body, id); return; }
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: { title, body, ...(Platform.OS === 'android' ? { channelId: 'reminders' } : {}) },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
  }).catch(() => {});
}

export async function cancel(id: string) {
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
}

// Anlık bildirim (arka plan görevi / koşul zaten dolu).
export async function presentNow(title: string, body: string, id?: string) {
  await Notifications.scheduleNotificationAsync({
    ...(id ? { identifier: id } : {}),
    content: { title, body, ...(Platform.OS === 'android' ? { channelId: 'reminders' } : {}) },
    trigger: null, // hemen
  }).catch(() => {});
}
