// shiftTime.ts — vardiya "HH:MM" saatlerini bugünün tarihine eşleyen yardımcılar.
export function parseHM(s: string | null | undefined): { h: number; m: number } | null {
  if (!s) return null;
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  return m ? { h: +m[1], m: +m[2] } : null;
}

// Bugünün tarihinde verilen saatin Date'i.
export function atToday(hm: string | null | undefined, base = new Date()): Date | null {
  const p = parseHM(hm);
  if (!p) return null;
  const d = new Date(base);
  d.setHours(p.h, p.m, 0, 0);
  return d;
}

export const shiftStartDate = (start: string | null, base = new Date()): Date | null => atToday(start, base);

// Vardiya bitişi; gece vardiyasında (overnight) bitiş başlangıçtan küçükse ertesi güne sarkar.
export function shiftEndDate(start: string | null, end: string | null, overnight: boolean, base = new Date()): Date | null {
  const e = atToday(end, base);
  if (!e) return null;
  const s = atToday(start, base);
  if (overnight && s && e.getTime() <= s.getTime()) e.setDate(e.getDate() + 1);
  return e;
}

export const addMinutes = (d: Date, min: number): Date => new Date(d.getTime() + min * 60000);
