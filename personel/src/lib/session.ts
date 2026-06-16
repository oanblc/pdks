// session.ts — JWT ve hatırlatma bağlamı kalıcılığı (SecureStore).
// Arka plan geofence görevi React state'e erişemez; gereken her şeyi buradan okur.
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'pdks-token';
const CTX_KEY = 'pdks-reminder-ctx';

export type Geo = { lat: number; lng: number; radius: number };
export type ReminderCtx = {
  apiBase: string;
  shiftStartAt: string | null; // ISO — backend (İstanbul, gece vardiyası bilinçli)
  shiftEndAt: string | null;   // ISO
  breakMin: number | null;
  lateToleranceMin: number;
  branchGeo: Geo | null;
  lastStatus?: 'outside' | 'inside' | 'break'; // backend'e ulaşılamazsa kullanılacak son bilinen durum
  lastStatusAt?: number;       // lastStatus ne zaman tazelendi (ms) — bayat veriye güvenmemek için
};

export async function saveToken(t: string | null) {
  try {
    if (t) await SecureStore.setItemAsync(TOKEN_KEY, t);
    else await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch { /* yoksay */ }
}
export async function loadToken(): Promise<string | null> {
  try { return await SecureStore.getItemAsync(TOKEN_KEY); } catch { return null; }
}

export async function saveReminderCtx(ctx: ReminderCtx) {
  try { await SecureStore.setItemAsync(CTX_KEY, JSON.stringify(ctx)); } catch { /* yoksay */ }
}
export async function loadReminderCtx(): Promise<ReminderCtx | null> {
  try { const s = await SecureStore.getItemAsync(CTX_KEY); return s ? JSON.parse(s) : null; } catch { return null; }
}
export async function clearReminderCtx() {
  try { await SecureStore.deleteItemAsync(CTX_KEY); } catch { /* yoksay */ }
}
