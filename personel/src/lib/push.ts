// push.ts — Expo push token kaydı (gerçek telefon bildirimi).
// EAS projectId yoksa (Expo Go / yapı kurulmamış) sessizce atlar; uygulama-içi duyuru yine çalışır.
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { api } from '../api';
import { ensureNotifPermission } from './notify';

let lastToken: string | null = null;

export async function registerPushToken(): Promise<void> {
  try {
    const projectId = (Constants.expoConfig as any)?.extra?.eas?.projectId ?? (Constants as any)?.easConfig?.projectId;
    if (!projectId) return; // EAS projectId yok → gerçek push atlanır (uygulama-içi duyuru devrede)
    if (!(await ensureNotifPermission())) return;
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    if (!token || token === lastToken) return;
    await api.registerPushToken(token, Platform.OS);
    lastToken = token;
  } catch { /* Expo Go / izin yok / ağ → sessiz */ }
}
