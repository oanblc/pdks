// api.ts — backend istemcisi (mobil).
// Yayında EXPO_PUBLIC_API_URL ile gerçek API adresi verilir; verilmezse geliştirme LAN IP'sine düşer.
const BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.1.106:4000';
export const API_BASE = BASE;

let token: string | null = null;
export function setToken(t: string | null) { token = t; }
export function getToken() { return token; }

// Oturum düştüğünde (401) kök uygulama buradan girişe döndürülür
let onUnauthorized: (() => void) | null = null;
export function setOnUnauthorized(fn: (() => void) | null) { onUnauthorized = fn; }

export type Emp = {
  id: number; tc: string; name: string; phone?: string | null; dept?: string | null;
  role?: string | null; sicil?: string | null; status: string; branch?: string | null; branchId?: number | null;
  shift?: string | null; startDate?: string | null;
  shiftStart?: string | null; shiftEnd?: string | null; breakMin?: number | null; overnight?: boolean;
  isManager?: boolean;
};

async function req(path: string, opts: RequestInit = {}): Promise<any> {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Geçerli bir oturumla 401 alındıysa (token süresi doldu / iptal) → girişe dön
    if (res.status === 401 && token) { setToken(null); onUnauthorized?.(); }
    throw new Error(data.error || `Hata (${res.status})`);
  }
  return data;
}

export const api = {
  login: (tc: string, password: string) =>
    req('/api/employee/login', { method: 'POST', body: JSON.stringify({ tc, password }) }) as Promise<{ token: string; employee: Emp }>,
  register: (body: { tc: string; name: string; phone?: string; address?: string; branchId?: number; password: string }) =>
    req('/api/employee/register', { method: 'POST', body: JSON.stringify(body) }) as Promise<{ ok: boolean }>,
  branches: () => req('/api/branches') as Promise<{ id: number; name: string; city: string; shift: string }[]>,
  me: () => req('/api/me') as Promise<{ employee: Emp; today: { status: 'outside' | 'inside' | 'break'; entryTime: string | null; breakStart: string | null }; lateToleranceMin: number; branchGeo: { lat: number; lng: number; radius: number } | null; kioskCode: string | null; shiftStartAt: string | null; shiftEndAt: string | null }>,
  punch: (branchId: number, action: string, coords?: { lat: number; lng: number }, deviceCode?: string) =>
    req('/api/punch', { method: 'POST', body: JSON.stringify({ branchId, action, ...(coords || {}), ...(deviceCode ? { deviceCode } : {}) }) }) as Promise<{ ok: boolean; action: string; time: string }>,
  branchSetLocation: (lat: number, lng: number, force = false) =>
    req('/api/branch/location', { method: 'POST', body: JSON.stringify({ lat, lng, force }) }) as Promise<{ ok: boolean; set: boolean; lat: number; lng: number }>,
  request: (body: { kind: 'leave' | 'fix'; type: string; detail?: string; leaveStart?: string; leaveEnd?: string }) =>
    req('/api/requests', { method: 'POST', body: JSON.stringify(body) }) as Promise<{ ok: boolean }>,
  myRequests: () => req('/api/requests/mine') as Promise<{ id: number; kind: string; type: string; detail?: string; status: string; createdAt: string }[]>,

  // kiosk (şube)
  branchLogin: (username: string, password: string, deviceCode?: string) =>
    req('/api/branch/login', { method: 'POST', body: JSON.stringify({ username, password, deviceCode }) }) as Promise<{ token: string; branch: { id: number; name: string; city: string; lat: number | null; lng: number | null }; device: { code: string; role: 'primary' | 'backup' } | null }>,
  branchToday: () => req('/api/branch/today') as Promise<{ empId: number; name: string; dept: string | null; in: string | null; out: string | null; status: 'inside' | 'break' | 'outside'; lastPunchId: number; reviewState: string; device: string | null }[]>,
  branchRequests: () => req('/api/branch/requests') as Promise<{ id: number; name: string; dept: string | null; kind: 'leave' | 'fix'; type: string; detail: string | null; leaveStart?: string | null; leaveEnd?: string | null; createdAt: string }[]>,
  branchDecideRequest: (id: number, decision: 'approve' | 'reject', note?: string) =>
    req(`/api/branch/requests/${id}/decide`, { method: 'POST', body: JSON.stringify({ decision, ...(note ? { note } : {}) }) }) as Promise<{ ok: boolean }>,
  reviewPunch: (id: number, status: 'ok' | 'disputed') =>
    req(`/api/punches/${id}/review`, { method: 'POST', body: JSON.stringify({ status }) }) as Promise<{ ok: boolean }>,
  branchEmployees: () => req('/api/branch/employees') as Promise<{ id: number; name: string; dept: string | null }[]>,
  branchVerifyPin: (pin: string) => req('/api/branch/verify-pin', { method: 'POST', body: JSON.stringify({ pin }) }) as Promise<{ ok: boolean }>,
  branchManualPunch: (employeeId: number, action: string, reason: string) =>
    req('/api/branch/manual-punch', { method: 'POST', body: JSON.stringify({ employeeId, action, reason }) }) as Promise<{ ok: boolean }>,
  changePassword: (current: string, next: string) =>
    req('/api/employee/change-password', { method: 'POST', body: JSON.stringify({ current, next }) }) as Promise<{ ok: boolean }>,
  forgot: (tc: string, phone?: string) =>
    req('/api/employee/forgot', { method: 'POST', body: JSON.stringify({ tc, phone }) }) as Promise<{ ok: boolean }>,
  branchEmployeeTimesheet: (empId: number, month?: string) =>
    req(`/api/branch/employee/${empId}/timesheet${month ? `?month=${month}` : ''}`) as Promise<{
      employee: { name: string } | null; range: string;
      days: { date: string; day: number; in: string | null; out: string | null; breakMin: number; netMin: number; diffMin: number; status: string; flagged: boolean; estimated: boolean }[];
      summary: { netMin: number; overtimeMin: number; present: number; missing: number };
    }>,

  // KVKK veri talebi
  dataRequest: (type: 'access' | 'rectify' | 'erase', note?: string) =>
    req('/api/data-request', { method: 'POST', body: JSON.stringify({ type, note }) }) as Promise<{ ok: boolean }>,
  notifications: () => req('/api/notifications') as Promise<{ icon: string; tone: string; title: string; body: string; time: string }[]>,
};
