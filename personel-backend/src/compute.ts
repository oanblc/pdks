// compute.ts — punch'lardan puantaj/mesai/anomali hesapları
type P = { action: string; serverTime: Date; status: string };

export const hm = (d: Date) => new Date(d).toTimeString().slice(0, 5);
export const dayKey = (d: Date) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};
export const hhmm = (min: number) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`;

const EXPECTED_MIN = 8 * 60; // varsayılan hedef net çalışma (8 saat)

export type DayOpts = { overnight?: boolean; expectedMin?: number; todayKey?: string };

export type DayRecord = {
  date: string; day: number; in: string | null; out: string | null;
  breakMin: number; netMin: number; diffMin: number;
  status: 'full' | 'over' | 'missing' | 'short' | 'leave' | 'holiday' | 'holiday-work'; flagged: boolean; estimated: boolean; inProgress: boolean;
  holidayName?: string;
};

// Gece vardiyasında sabaha sarkan basışı, başladığı (önceki) iş gününe yaz
export const workDayKey = (d: Date, overnight = false) => {
  const x = new Date(d);
  if (overnight && x.getHours() < 12) x.setDate(x.getDate() - 1);
  return dayKey(x);
};

export function computeDay(date: string, punches: P[], opts: DayOpts = {}): DayRecord | null {
  const expectedMin = opts.expectedMin ?? EXPECTED_MIN;
  const ps = [...punches].sort((a, b) => +a.serverTime - +b.serverTime);
  let inT: Date | null = null, outT: Date | null = null, breakMs = 0, lastBreak: Date | null = null;
  let flagged = false;
  for (const p of ps) {
    if (p.status === 'review') flagged = true;
    if (p.action === 'enter') { if (!inT) inT = p.serverTime; }
    else if (p.action === 'exit') outT = p.serverTime; // gece vardiyasında ertesi gün damgalı olabilir; +out-+in pozitif kalır
    else if (p.action === 'break-out') lastBreak = p.serverTime;
    else if (p.action === 'break-in' && lastBreak) { breakMs += +p.serverTime - +lastBreak; lastBreak = null; }
  }
  if (!inT) return null;
  const hasOut = !!outT;
  // Moladan dönülmeden çıkış basıldıysa (break-out var, break-in yok), o süreyi de moladan say
  if (lastBreak && outT) breakMs += +outT - +lastBreak;
  const breakMin = Math.round(breakMs / 60000);
  let netMin: number, diffMin: number, estimated = false;
  let status: DayRecord['status'];
  if (hasOut) {
    netMin = Math.max(0, Math.round((+outT! - +inT) / 60000) - breakMin);
    diffMin = netMin - expectedMin;
    status = netMin > expectedMin + 30 ? 'over' : netMin < expectedMin - 30 ? 'short' : 'full';
  } else {
    // Eksik çıkış: günü sıfırlama; beklenen vardiya süresinden tahmini net üret, incelemeye bayrakla
    netMin = Math.max(0, expectedMin - breakMin);
    diffMin = 0;
    estimated = true;
    status = 'missing';
  }
  // Gün içi devam eden (bugün giriş var, henüz çıkış yok) → "eksik" sayılmaz
  const inProgress = !hasOut && !!opts.todayKey && date === opts.todayKey;
  return {
    date, day: new Date(inT).getDate(),
    in: hm(inT), out: hasOut ? hm(outT!) : null,
    breakMin, netMin, diffMin, status, flagged, estimated, inProgress,
  };
}

// punch listesini iş gününe göre grupla → gün kayıtları
export function dailyRecords(punches: P[], opts: DayOpts = {}): DayRecord[] {
  const byDay = new Map<string, P[]>();
  for (const p of punches) { const k = workDayKey(p.serverTime, opts.overnight); const a = byDay.get(k) || []; a.push(p); byDay.set(k, a); }
  const recs: DayRecord[] = [];
  for (const [k, ps] of byDay) { const r = computeDay(k, ps, opts); if (r) recs.push(r); }
  return recs.sort((a, b) => (a.date < b.date ? -1 : 1));
}

// Vardiya tanımından beklenen net süre (dk) — gece vardiyasında bitiş ertesi güne sarkar
export function shiftExpectedMin(shift?: { start: string; end: string; breakMin: number; overnight: boolean } | null): number {
  if (!shift) return EXPECTED_MIN;
  const toMin = (s: string) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
  let span = toMin(shift.end) - toMin(shift.start);
  if (span <= 0) span += 24 * 60;
  return Math.max(0, span - (shift.breakMin || 0));
}

export const monthRange = (month: string) => {
  const [y, m] = month.split('-').map(Number);
  return { start: new Date(y, m - 1, 1), end: new Date(y, m, 1) };
};

// ISO hafta anahtarı (yıl-hafta) — 45 saat haftalık hesap için
export function weekKey(d: Date): string {
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (x.getUTCDay() + 6) % 7;
  x.setUTCDate(x.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(x.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((+x - +firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${x.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}
