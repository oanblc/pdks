// api.ts — backend istemcisi
const BASE = (import.meta as any).env?.VITE_API ?? 'http://localhost:4000'

let token: string | null = localStorage.getItem('token')
export function setToken(t: string | null) {
  token = t
  if (t) localStorage.setItem('token', t); else localStorage.removeItem('token')
}
export function getToken() { return token }

// Ekranlara görünür geri bildirim için global olaylar (sessiz spinner/boş ekran yerine)
const emit = (name: string, detail?: any) => { try { window.dispatchEvent(new CustomEvent(name, { detail })) } catch { /* SSR yok */ } }

async function req(path: string, opts: RequestInit = {}) {
  let res: Response
  try {
    res = await fetch(BASE + path, {
      ...opts,
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(opts.headers || {}),
      },
    })
  } catch {
    emit('api-error', 'Sunucuya ulaşılamadı. Bağlantınızı kontrol edin.')
    throw new Error('Sunucuya ulaşılamadı')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    // 401: oturum düştü → uygulamayı çıkışa yönlendir
    if (res.status === 401) { setToken(null); emit('api-unauthorized') }
    // 5xx: sunucu hatası → global uyarı (4xx doğrulama hataları ekran içinde gösterilir)
    else if (res.status >= 500) emit('api-error', 'Sunucu hatası. Lütfen tekrar deneyin.')
    throw new Error((data as any).error || `Hata (${res.status})`)
  }
  return data
}

export type AdminInfo = { id: number; name: string; email: string; role: 'ik' | 'mu' | 'su' }
export type NotifItem = { id: string; kind: string; tone: 'ok' | 'warn' | 'err' | 'neu' | 'brand'; icon: string; title: string; body: string; time: string; route: string }

export const api = {
  adminLogin: (email: string, password: string) =>
    req('/api/admin/login', { method: 'POST', body: JSON.stringify({ email, password }) }) as Promise<{ token: string; admin: AdminInfo }>,
  dashboard: () => req('/api/dashboard'),
  employees: () => req('/api/employees'),
  approve: (id: number) => req(`/api/employees/${id}/approve`, { method: 'POST' }),
  branches: () => req('/api/branches'),
  punchesToday: () => req('/api/punches/today'),
  requests: () => req('/api/requests'),
  approveRequest: (id: number) => req(`/api/requests/${id}/approve`, { method: 'POST' }),
  rejectRequest: (id: number) => req(`/api/requests/${id}/reject`, { method: 'POST' }),
  bulkDecideRequests: (ids: number[], decision: 'approve' | 'reject') =>
    req('/api/requests/bulk-decide', { method: 'POST', body: JSON.stringify({ ids, decision }) }) as Promise<{ ok: boolean; done: number; skipped: number }>,
  audit: () => req('/api/audit'),
  shifts: () => req('/api/shifts'),
  timesheet: (month?: string) => req(`/api/timesheet${month ? `?month=${month}` : ''}`),
  employeeTimesheet: (id: number, opts?: { month?: string; from?: string; to?: string }) => {
    const q = opts?.from && opts?.to ? `?from=${opts.from}&to=${opts.to}` : opts?.month ? `?month=${opts.month}` : ''
    return req(`/api/employees/${id}/timesheet${q}`)
  },
  resolveFlag: (id: number, date: string, action: 'approve' | 'dispute') =>
    req(`/api/employees/${id}/resolve-flag`, { method: 'POST', body: JSON.stringify({ date, action }) }),
  anomalies: () => req('/api/anomalies'),
  riskScores: () => req('/api/risk-scores'),
  riskSettings: () => req('/api/risk-settings'),
  updateRiskSettings: (body: { weights: Record<string, number>; bandHigh: number; bandMid: number; lateToleranceMin: number; longShiftHours: number }) =>
    req('/api/risk-settings', { method: 'PUT', body: JSON.stringify(body) }),
  reports: (month?: string) => req(`/api/reports${month ? `?month=${month}` : ''}`),
  adminNotifications: () => req('/api/admin/notifications') as Promise<{ items: NotifItem[]; unreadCount: number; lastSeen: string }>,
  markNotificationsSeen: () => req('/api/admin/notifications/seen', { method: 'POST' }),
  kvkk: () => req('/api/kvkk'),
  updateKvkkDocument: (body: { title: string; body: string }) => req('/api/kvkk/document', { method: 'PATCH', body: JSON.stringify(body) }),
  publishKvkkVersion: (body: { version: string; title: string; body: string }) => req('/api/kvkk/version', { method: 'POST', body: JSON.stringify(body) }),
  createEmployee: (body: { name: string; tc: string; dept?: string; role?: string; branchId?: number; annualLeaveDays?: number; startDate?: string; password: string }) =>
    req('/api/employees', { method: 'POST', body: JSON.stringify(body) }),
  offboardEmployee: (id: number, body: { exitDate: string; reason?: string }) => req(`/api/employees/${id}/offboard`, { method: 'POST', body: JSON.stringify(body) }),
  reactivateEmployee: (id: number) => req(`/api/employees/${id}/reactivate`, { method: 'POST' }),
  updateEmployee: (id: number, body: { name?: string; dept?: string | null; role?: string | null; branchId?: number | null; shiftId?: number | null; isManager?: boolean; annualLeaveDays?: number; startDate?: string | null }) =>
    req(`/api/employees/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  devices: () => req('/api/devices'),
  addBranch: (body: { name: string; city?: string; username: string; password: string; managerPin?: string }) =>
    req('/api/branches', { method: 'POST', body: JSON.stringify(body) }),
  updateBranch: (id: number, body: { name?: string; city?: string | null; lat?: number | null; lng?: number | null; radius?: number; workingDays?: number[] }) =>
    req(`/api/branches/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  pairDevice: (branchId: number, label?: string) => req('/api/devices', { method: 'POST', body: JSON.stringify({ branchId, label }) }),
  updateDevice: (id: number, body: { label?: string | null }) => req(`/api/devices/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  revokeDevice: (id: number) => req(`/api/devices/${id}/revoke`, { method: 'POST' }),
  reactivateDevice: (id: number) => req(`/api/devices/${id}/reactivate`, { method: 'POST' }),
  addShift: (body: { name: string; start: string; end: string; breakMin?: number; overnight?: boolean }) =>
    req('/api/shifts', { method: 'POST', body: JSON.stringify(body) }),
  updateShift: (id: number, body: { name?: string; start?: string; end?: string; breakMin?: number; overnight?: boolean }) =>
    req(`/api/shifts/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteShift: (id: number) => req(`/api/shifts/${id}`, { method: 'DELETE' }),
  holidays: () => req('/api/holidays'),
  addHoliday: (body: { date: string; name: string; type: 'resmi' | 'dini' | 'custom'; workingBranchIds: number[] }) =>
    req('/api/holidays', { method: 'POST', body: JSON.stringify(body) }),
  updateHoliday: (id: number, body: { date?: string; name?: string; type?: 'resmi' | 'dini' | 'custom'; workingBranchIds?: number[] }) =>
    req(`/api/holidays/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteHoliday: (id: number) => req(`/api/holidays/${id}`, { method: 'DELETE' }),
  importHolidays: (year: number) => req('/api/holidays/import', { method: 'POST', body: JSON.stringify({ year }) }),
  dsarDone: (id: number) => req(`/api/data-requests/${id}/done`, { method: 'POST' }),
  dsarDetail: (id: number) => req(`/api/data-requests/${id}`),
}
