// punchQueue.ts — çevrimdışı okutma kuyruğu
// Bağlantı yokken okutmalar burada saklanır (expo-secure-store ile kalıcı), bağlantı gelince sırayla gönderilir.
// Her kayıt benzersiz clientId taşır → tekrar gönderimde backend çift kayıt açmaz (idempotent).
import * as SecureStore from 'expo-secure-store';
import * as Network from 'expo-network';
import { api, type ApiError } from '../api';

const KEY = 'punch_queue_v1';
const MAX = 50; // taşarsa en eski okutma düşürülür (pratikte bu sayıya ulaşılmaz)

export type QueuedPunch = {
  clientId: string;
  branchId: number;
  action: string;
  lat?: number;
  lng?: number;
  deviceCode?: string;
  clientTime: string; // ISO — gerçek okutma anı
};

export function newClientId(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

async function read(): Promise<QueuedPunch[]> {
  try { const s = await SecureStore.getItemAsync(KEY); const a = s ? JSON.parse(s) : []; return Array.isArray(a) ? a : []; }
  catch { return []; }
}
async function write(q: QueuedPunch[]): Promise<void> {
  try { await SecureStore.setItemAsync(KEY, JSON.stringify(q)); } catch { /* yer yoksa sessiz geç */ }
}

export async function queueLength(): Promise<number> {
  return (await read()).length;
}

export async function enqueuePunch(item: QueuedPunch): Promise<void> {
  const q = await read();
  q.push(item);
  while (q.length > MAX) q.shift();
  await write(q);
}

let flushing = false;

// Kuyruğu sırayla göndermeyi dener. Ağ hatasında durur (kayıt kalır), kalıcı 4xx'te kaydı düşürür.
export async function flushQueue(): Promise<{ sent: number; left: number }> {
  if (flushing) return { sent: 0, left: await queueLength() };
  flushing = true;
  let sent = 0;
  try {
    // Bağlantı yoksa hiç deneme (pil/istek tasarrufu)
    try { const st = await Network.getNetworkStateAsync(); if (st.isConnected === false) return { sent: 0, left: await queueLength() }; } catch { /* durum alınamadı → yine de dene */ }

    let q = await read();
    while (q.length) {
      const it = q[0];
      try {
        await api.punch(it.branchId, it.action, it.lat != null && it.lng != null ? { lat: it.lat, lng: it.lng } : undefined, it.deviceCode, { clientId: it.clientId, clientTime: it.clientTime });
        q = q.slice(1); sent++; await write(q); // başarılı → kuyruktan çıkar
      } catch (e) {
        const err = e as ApiError;
        if (err?.network) break; // ağ yok → sonra tekrar dene, kaydı koru
        if (err?.status && err.status >= 400 && err.status < 500) { q = q.slice(1); await write(q); continue; } // kalıcı ret (izinli/geofence/iptal cihaz) → düş
        break; // 5xx vb. → sonra dene
      }
    }
    return { sent, left: q.length };
  } finally {
    flushing = false;
  }
}
