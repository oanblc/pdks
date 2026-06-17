// server.ts — Fastify API: auth + çekirdek endpoint'ler (mobil + web aynı veriyi paylaşır)
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from './db.js';
import { dailyRecords, monthRange, weekKey, shiftExpectedMin, workDayKey, type DayOpts } from './compute.js';

const KVKK_VERSION = 'v2.1';            // varsayılan/başlangıç sürümü (Setting yoksa bu kullanılır)
const KVKK_VERSION_KEY = 'kvkk-version';
const kvkkDocKey = (v: string) => `kvkk-doc-${v}`;
const KVKK_DOC_DEFAULT = {
  title: 'Çalışan Kişisel Verilerinin İşlenmesine İlişkin Aydınlatma Metni',
  body: `Bu aydınlatma metni, 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") md. 10 kapsamında, veri sorumlusu sıfatıyla işvereniniz tarafından, çalışan kişisel verilerinizin işlenmesine ilişkin sizi bilgilendirmek amacıyla hazırlanmıştır.

1) İŞLENEN KİŞİSEL VERİLER
- Kimlik: ad-soyad, T.C. kimlik numarası, sicil numarası.
- İletişim: telefon, adres.
- Özlük: departman, görev/unvan, şube, vardiya, işe giriş/çıkış tarihi.
- Çalışma verisi: giriş-çıkış (puantaj) okutmaları, mola kayıtları, izin ve düzeltme talepleri.
- İşlem güvenliği: cihaz/şube konum (geofence) ve QR okutma kayıtları.

2) İŞLEME AMAÇLARI
- İş sözleşmesinin kurulması ve ifası, puantaj ve bordro süreçlerinin yürütülmesi.
- İş sağlığı ve güvenliği ile devam-kontrol (PDKS) yükümlülüklerinin yerine getirilmesi.
- İş Kanunu, SGK ve ilgili mevzuattan doğan yasal yükümlülüklerin karşılanması.

3) HUKUKİ SEBEP (KVKK md. 5)
- Sözleşmenin kurulması/ifası için gerekli olması.
- Veri sorumlusunun hukuki yükümlülüğünü yerine getirmesi.
- İlgili kişinin temel hak ve özgürlüklerine zarar vermemek kaydıyla meşru menfaat.

4) AKTARIM
Kişisel verileriniz; yasal yükümlülükler çerçevesinde SGK ve yetkili kamu kurumlarına, hizmet aldığımız bordro/muhasebe ve bilişim tedarikçilerine, yalnızca ilgili amaçla sınırlı olarak aktarılabilir.

5) SAKLAMA SÜRESİ
Verileriniz, ilgili mevzuatta öngörülen zorunlu saklama süreleri (ör. puantaj/bordro için yasal süreler) boyunca saklanır; süre sonunda silinir, yok edilir veya anonim hâle getirilir.

6) HAKLARINIZ (KVKK md. 11)
Kişisel verilerinize erişme, düzeltilmesini veya silinmesini isteme, işlenmesine itiraz etme haklarına sahipsiniz. Taleplerinizi uygulama üzerinden veya İK birimine iletebilirsiniz; başvurunuz en geç 30 gün içinde sonuçlandırılır.

Bu metni okuduğunuzu ve kişisel verilerinizin yukarıdaki kapsamda işlenmesine ilişkin bilgilendirildiğinizi onaylarsınız.`,
};
async function getKvkkVersion() {
  const s = await prisma.setting.findUnique({ where: { key: KVKK_VERSION_KEY } });
  return s?.value || KVKK_VERSION;
}
async function getKvkkDoc(version: string) {
  const s = await prisma.setting.findUnique({ where: { key: kvkkDocKey(version) } });
  if (s) { try { const d = JSON.parse(s.value); return { version, title: d.title, body: d.body, updatedAt: d.updatedAt ?? null }; } catch { /* bozuk kayıt → varsayılana düş */ } }
  return { version, title: KVKK_DOC_DEFAULT.title, body: KVKK_DOC_DEFAULT.body, updatedAt: null };
}
const currentMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

const PORT = Number(process.env.PORT || 4000);
const PROD = process.env.NODE_ENV === 'production';
// Üretimde tahmin edilebilir varsayılan sır kullanılamaz — boot'ta zorunlu.
if (PROD && !process.env.JWT_SECRET) { console.error('FATAL: production ortamında JWT_SECRET zorunludur.'); process.exit(1); }
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const TOKEN_TTL = '30d'; // token süresi — süresiz token riski yerine yenilenebilir 30 gün

const app = Fastify({ logger: true });

// Yayında CSP açık (makul varsayılan direktiflerle); geliştirmede kapalı (Vite/HMR rahatlığı için)
await app.register(helmet, { contentSecurityPolicy: PROD ? undefined : false });
// CORS: ALLOWED_ORIGINS (virgüllü liste) verilmişse yalnız o originlere izin ver; verilmezse dev'de tüm originler.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
if (PROD && ALLOWED_ORIGINS.length === 0) console.warn('UYARI: production ortamında ALLOWED_ORIGINS tanımlı değil — çapraz-origin istekler reddedilecek (varsayılan kapalı).');
await app.register(cors, {
  // Prod'da ALLOWED_ORIGINS boşsa varsayılan KAPALI (çapraz-origin reddedilir); dev'de tüm originler açık.
  origin: ALLOWED_ORIGINS.length > 0 ? ALLOWED_ORIGINS : (PROD ? false : true),
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
});
await app.register(rateLimit, { max: 300, timeWindow: '1 minute' });
await app.register(jwt, { secret: JWT_SECRET });

// Gövdesiz POST'lar (onayla, kapat, iptal vb.) tarayıcıdan content-type:application/json
// ama boş body ile gelir; Fastify varsayılanı bunu 400 ile reddeder. Boş gövdeyi {} say.
app.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body: string, done) => {
  if (!body) return done(null, {});
  try { done(null, JSON.parse(body)); } catch (e) { done(e as Error, undefined); }
});

// ── auth yardımcıları ──
type JwtUser = { sub: number; kind: 'admin' | 'employee' | 'branch'; role?: string; deviceId?: number };
async function auth(req: any, reply: any, kind?: 'admin' | 'employee' | 'branch') {
  try { await req.jwtVerify(); } catch { return reply.code(401).send({ error: 'Oturum gerekli' }); }
  if (kind && (req.user as JwtUser).kind !== kind) return reply.code(403).send({ error: 'Yetkisiz' });
}
const requireAdmin = (req: any, reply: any) => auth(req, reply, 'admin');
const requireEmployee = (req: any, reply: any) => auth(req, reply, 'employee');

function bad(reply: any, msg: string) { return reply.code(400).send({ error: msg }); }
function startOfToday() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }

// ── Geofence: çalışan basışı yalnızca şube konumunun bu yarıçapı içinde geçerli ──
const PUNCH_RADIUS_M = 100;
function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat), dLng = toRad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function statusFromPunches(punches: { action: string; serverTime: Date }[]) {
  let status: 'outside' | 'inside' | 'break' = 'outside';
  let entryTime: Date | null = null, breakStart: Date | null = null;
  for (const p of punches) {
    if (p.action === 'enter') { status = 'inside'; entryTime = p.serverTime; breakStart = null; }
    else if (p.action === 'exit') { status = 'outside'; entryTime = null; breakStart = null; }
    else if (p.action === 'break-out') { status = 'break'; breakStart = p.serverTime; }
    else if (p.action === 'break-in') { status = 'inside'; breakStart = null; }
  }
  return { status, entryTime, breakStart };
}

app.get('/api/health', async () => ({ ok: true, time: new Date().toISOString() }));

/* ───────── AUTH ───────── */
app.post('/api/admin/login', { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } }, async (req, reply) => {
  const p = z.object({ email: z.string().email(), password: z.string().min(1) }).safeParse(req.body);
  if (!p.success) return bad(reply, 'E-posta ve şifre gerekli');
  const admin = await prisma.adminUser.findUnique({ where: { email: p.data.email.toLowerCase() } });
  if (!admin || !(await bcrypt.compare(p.data.password, admin.passwordHash)))
    return reply.code(401).send({ error: 'E-posta veya şifre hatalı' });
  const token = app.jwt.sign({ sub: admin.id, kind: 'admin', role: admin.role }, { expiresIn: TOKEN_TTL });
  return { token, admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role } };
});

// TC kimlik numarası algoritmik doğrulaması (11 hane, ilk hane 0 değil, kontrol haneleri tutarlı)
function isValidTC(tc: string): boolean {
  if (!/^\d{11}$/.test(tc) || tc[0] === '0') return false;
  const d = tc.split('').map(Number);
  const odd = d[0] + d[2] + d[4] + d[6] + d[8];
  const even = d[1] + d[3] + d[5] + d[7];
  if (((odd * 7 - even) % 10 + 10) % 10 !== d[9]) return false;
  return d.slice(0, 10).reduce((a, b) => a + b, 0) % 10 === d[10];
}
const PHONE = /^0?5\d{9}$/; // Türk cep telefonu (05XX...)
app.post('/api/employee/register', { config: { rateLimit: { max: 40, timeWindow: '1 minute' } } }, async (req, reply) => {
  const p = z.object({
    tc: z.string().regex(/^\d{11}$/, 'TC 11 haneli olmalı'),
    name: z.string().min(2), phone: z.string().optional(), address: z.string().optional(),
    branchId: z.number().int().optional(), password: z.string().min(8, 'Şifre en az 8 karakter olmalı'),
  }).safeParse(req.body);
  if (!p.success) return bad(reply, p.error.issues[0]?.message || 'Geçersiz veri');
  if (!isValidTC(p.data.tc)) return bad(reply, 'Geçersiz TC kimlik numarası');
  if (p.data.phone && !PHONE.test(p.data.phone.replace(/\s/g, ''))) return bad(reply, 'Telefon 05XX ile başlayan 11 hane olmalı');
  if (p.data.branchId != null && !(await prisma.branch.findUnique({ where: { id: p.data.branchId } }))) return bad(reply, 'Geçersiz şube');
  if (await prisma.employee.findUnique({ where: { tc: p.data.tc } }))
    return bad(reply, 'Bu TC kimlik no ile kayıt zaten var');
  const passwordHash = await bcrypt.hash(p.data.password, 10);
  await prisma.employee.create({ data: {
    tc: p.data.tc, name: p.data.name, phone: p.data.phone, address: p.data.address,
    branchId: p.data.branchId ?? null, passwordHash, status: 'pending',
  } });
  return { ok: true };
});

app.post('/api/employee/login', { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } }, async (req, reply) => {
  const p = z.object({ tc: z.string().min(1), password: z.string().min(1) }).safeParse(req.body);
  if (!p.success) return bad(reply, 'TC ve şifre gerekli');
  const emp = await prisma.employee.findUnique({ where: { tc: p.data.tc }, include: { branch: true, shift: true } });
  if (!emp || !(await bcrypt.compare(p.data.password, emp.passwordHash)))
    return reply.code(401).send({ error: 'TC veya şifre hatalı' });
  if (emp.status === 'pending') return reply.code(403).send({ error: 'Kaydınız henüz onaylanmadı' });
  if (emp.status !== 'active') return reply.code(403).send({ error: 'Hesabınız aktif değil' });
  const token = app.jwt.sign({ sub: emp.id, kind: 'employee' }, { expiresIn: TOKEN_TTL });
  return { token, employee: publicEmployee(emp) };
});

function publicEmployee(e: any) {
  return { id: e.id, tc: e.tc, name: e.name, phone: e.phone, dept: e.dept, role: e.role, sicil: e.sicil, status: e.status, isManager: e.isManager ?? false, annualLeaveDays: e.annualLeaveDays ?? 14, avatar: e.avatar ?? null, branch: e.branch?.name ?? null, branchId: e.branchId, shiftId: e.shiftId, shift: e.shift ? `${e.shift.start} – ${e.shift.end}` : null, shiftStart: e.shift?.start ?? null, shiftEnd: e.shift?.end ?? null, breakMin: e.shift?.breakMin ?? null, overnight: e.shift?.overnight ?? false, startDate: e.startDate, exitDate: e.exitDate, exitReason: e.exitReason };
}

// ── Yıllık izin bakiyesi ── (sadece "Yıllık izin" tipi düşer; mazeret/hastalık ayrı)
// Gün sayımı: leaveStart..leaveEnd takvim günü (dahil), içinde bulunulan yıla kırpılır.
function leaveDaysInYear(start: string, end: string, year: number): number {
  const ys = `${year}-01-01`, ye = `${year}-12-31`;
  const s = start < ys ? ys : start, e = end > ye ? ye : end;
  if (s > e) return 0;
  return Math.round((+new Date(e + 'T00:00:00') - +new Date(s + 'T00:00:00')) / 86400000) + 1;
}
async function annualLeaveBalances(year: number): Promise<Map<number, { used: number; pending: number }>> {
  const reqs = await prisma.request.findMany({ where: { kind: 'leave', type: 'Yıllık izin', status: { in: ['approved', 'pending'] } } });
  const m = new Map<number, { used: number; pending: number }>();
  for (const r of reqs) {
    if (!r.leaveStart || !r.leaveEnd) continue;
    const d = leaveDaysInYear(r.leaveStart, r.leaveEnd, year);
    if (d <= 0) continue;
    const cur = m.get(r.employeeId) ?? { used: 0, pending: 0 };
    if (r.status === 'approved') cur.used += d; else cur.pending += d;
    m.set(r.employeeId, cur);
  }
  return m;
}
function leaveBalanceOf(map: Map<number, { used: number; pending: number }>, empId: number, entitlement: number) {
  const b = map.get(empId) ?? { used: 0, pending: 0 };
  return { entitlement, used: b.used, pending: b.pending, remaining: entitlement - b.used };
}

// Çakışmayan sicil üret: mevcut en yüksek sayısal sicilin bir fazlası (taban 10400).
async function nextSicil(): Promise<string> {
  const emps = await prisma.employee.findMany({ select: { sicil: true } });
  let max = 10400;
  for (const e of emps) { const n = Number(e.sicil); if (Number.isFinite(n) && n > max) max = n; }
  return String(max + 1);
}

/* ───────── ÇALIŞAN (mobil) ───────── */
app.get('/api/branches', async (req: any) => {
  // Konum (geofence merkezi/yarıçapı) sadece admin'e döner; public liste konum sızdırmaz.
  let isAdmin = false;
  try { await req.jwtVerify(); isAdmin = req.user?.kind === 'admin'; } catch { /* anonim/çalışan */ }
  const branches = await prisma.branch.findMany({ orderBy: { id: 'asc' } });
  return branches.map(b => isAdmin
    ? { id: b.id, name: b.name, city: b.city, shift: b.shift, lat: b.lat, lng: b.lng, radius: b.radius, workingDays: parseWorkingDays((b as any).workingDays), kioskPin: (() => { const mp = (b as any).managerPin; return mp && !String(mp).startsWith('$2') ? mp : null; })() }
    : { id: b.id, name: b.name, city: b.city, shift: b.shift, workingDays: parseWorkingDays((b as any).workingDays) });
});

app.get('/api/me', { preHandler: requireEmployee }, async (req: any) => {
  const emp = await prisma.employee.findUnique({ where: { id: req.user.sub }, include: { branch: true, shift: true } });
  const punches = await prisma.punch.findMany({ where: { employeeId: req.user.sub, serverTime: { gte: startOfToday() } }, orderBy: { serverTime: 'asc' } });
  const cfg = await getRiskCfg();
  // Çalışanın kendi şubesinin geofence bilgisi (hatırlatmalar için) — yalnız kendi şubesi
  const b = (emp as any)?.branch;
  const branchGeo = b && b.lat != null && b.lng != null ? { lat: b.lat, lng: b.lng, radius: b.radius ?? 100 } : null;
  // Yalnız şube yetkilisi bugünün kiosk kodunu görür
  // Yalnız şube yetkilisi, şubesinin statik kiosk PIN'ini görür
  const kioskCode = emp?.isManager ? ((emp as any)?.branch?.managerPin ?? null) : null;
  // Vardiya baş/bitiş mutlak zamanları (İstanbul, gece vardiyası bilinçli) — hatırlatmalar istemcide TZ hesabı yapmasın
  const { startAt: shiftStartAt, endAt: shiftEndAt } = shiftInstants((emp as any)?.shift);
  const balances = await annualLeaveBalances(new Date().getFullYear());
  const leave = leaveBalanceOf(balances, req.user.sub, (emp as any)?.annualLeaveDays ?? 14);
  return { employee: publicEmployee(emp), today: statusFromPunches(punches), lateToleranceMin: cfg.lateToleranceMin, branchGeo, kioskCode, shiftStartAt, shiftEndAt, leave };
});

app.post('/api/punch', { preHandler: requireEmployee, config: { rateLimit: { max: 30, timeWindow: '1 minute' } } }, async (req: any, reply) => {
  const p = z.object({
    branchId: z.number().int(),
    action: z.enum(['enter', 'exit', 'break-out', 'break-in']),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
    deviceCode: z.string().optional(), // okutulan ekranın/cihazın kodu (QR'dan)
    clientTime: z.string().datetime().optional(), // çevrimdışı kuyruk: gerçek okutma anı (ISO)
    clientId: z.string().min(8).max(64).optional(), // çevrimdışı idempotency anahtarı
  }).safeParse(req.body);
  if (!p.success) return bad(reply, 'Geçersiz okutma');

  // ── Çevrimdışı idempotency: aynı clientId ile gelen tekrar yeni kayıt açmaz ──
  if (p.data.clientId) {
    const dup = await prisma.punch.findUnique({ where: { clientId: p.data.clientId } });
    if (dup) return { ok: true, action: dup.action, time: dup.serverTime, duplicate: true };
  }

  // ── Gerçek okutma anı: çevrimdışı kuyruktan geldiyse clientTime (mantıklı sınırlar içinde) ──
  // Saat manipülasyonuna karşı: gelecekte >2 dk veya geçmişte >7 gün olan zaman damgası reddedilir → sunucu zamanına düşer.
  let punchAt = new Date();
  let source = 'qr';
  if (p.data.clientTime) {
    const t = new Date(p.data.clientTime);
    const now = Date.now();
    if (!isNaN(+t) && +t <= now + 2 * 60_000 && +t >= now - 7 * 86_400_000) { punchAt = t; source = 'offline'; }
    else source = 'offline'; // şüpheli zaman → yine de offline işaretle, ama sunucu zamanını kullan
  }

  // Çıkış sürecindeki/onaysız çalışan token'ı elinde olsa bile okutamaz.
  const me = await prisma.employee.findUnique({ where: { id: req.user.sub } });
  if (!me || me.status !== 'active') return reply.code(403).send({ error: 'Hesabınız aktif değil, okutma yapılamaz' });

  // Okutma günü izinliyse okutma yapamaz (çevrimdışıda gerçek okutma gününe bakılır).
  if (await isOnApprovedLeave(req.user.sub, dKey(punchAt)))
    return reply.code(403).send({ error: 'Bugün izinlisiniz; giriş-çıkış okutması yapılamaz.', code: 'ON_LEAVE' });

  // ── Hangi ekrandan okutuldu: cihaz kodu verildiyse doğrula (şubeye ait + iptal değil) ──
  let deviceId: number | null = null;
  if (p.data.deviceCode) {
    const dev = await prisma.device.findUnique({ where: { code: p.data.deviceCode } });
    if (!dev || dev.branchId !== p.data.branchId) return reply.code(403).send({ error: 'Bu cihaz bu şubeye tanımlı değil' });
    if (dev.status === 'revoked') return reply.code(403).send({ error: 'Bu ekran (cihaz) iptal edilmiş; okutma yapılamaz' });
    deviceId = dev.id;
  }

  // ── Konum geofence: şube merkezi tanımlıysa, basış 100 m içinde olmalı ──
  const branch = await prisma.branch.findUnique({ where: { id: p.data.branchId } });
  if (!branch) return bad(reply, 'Şube bulunamadı');
  if (branch.lat != null && branch.lng != null) {
    if (p.data.lat == null || p.data.lng == null)
      return reply.code(403).send({ error: 'Konum gerekli. Okutma için konum iznini açın.' });
    const radius = branch.radius ?? PUNCH_RADIUS_M;
    const d = distanceMeters(p.data.lat, p.data.lng, branch.lat, branch.lng);
    if (d > radius)
      return reply.code(403).send({ error: `İşletmeden uzaktasınız (~${Math.round(d)} m). Okutma yalnızca şube konumunun ${radius} m içinde yapılabilir.`, code: 'GEOFENCE', distance: Math.round(d) });
  }
  // ── İdempotency: 60 sn içinde aynı eylemin tekrarı yeni kayıt açmaz (çift okutma/double-punch) ──
  const last = await prisma.punch.findFirst({ where: { employeeId: req.user.sub }, orderBy: { serverTime: 'desc' } });
  if (last && last.action === p.data.action && Math.abs(+punchAt - +last.serverTime) < 60_000)
    return { ok: true, action: last.action, time: last.serverTime, duplicate: true };

  // NOT: gerçek güvenlik dilimi — imzalı QR token doğrulaması burada eklenecek.
  let punch;
  try {
    punch = await prisma.punch.create({ data: {
      employeeId: req.user.sub, branchId: p.data.branchId, deviceId, action: p.data.action,
      source, serverTime: punchAt, clientId: p.data.clientId ?? null,
    } });
  } catch (e: any) {
    // clientId benzersiz çakışması (yarış: aynı kuyruk kaydı iki kez) → çift kayıt sayma
    if (p.data.clientId && String(e?.code) === 'P2002') {
      const dup = await prisma.punch.findUnique({ where: { clientId: p.data.clientId } });
      if (dup) return { ok: true, action: dup.action, time: dup.serverTime, duplicate: true };
    }
    throw e;
  }
  return { ok: true, action: punch.action, time: punch.serverTime };
});

const DATEKEY = /^\d{4}-\d{2}-\d{2}$/;
// Biçim regex'ten geçse de takvimsel geçerlilik (örn. 2026-02-31 reddedilsin) kontrol edilir
function isRealDate(s: string): boolean {
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}
app.post('/api/requests', { preHandler: requireEmployee, config: { rateLimit: { max: 12, timeWindow: '1 minute' } } }, async (req: any, reply) => {
  const p = z.object({
    kind: z.enum(['leave', 'fix']), type: z.string(), detail: z.string().optional(),
    leaveStart: z.string().regex(DATEKEY).optional(), leaveEnd: z.string().regex(DATEKEY).optional(),
  }).safeParse(req.body);
  if (!p.success) return bad(reply, 'Geçersiz talep');
  if (p.data.kind === 'leave') {
    for (const v of [p.data.leaveStart, p.data.leaveEnd]) if (v && !isRealDate(v)) return bad(reply, 'Geçersiz tarih');
  }
  // İzin talebi en az başlangıç tarihi ister; bitiş verilmezse tek günlük sayılır (başlangıç = bitiş).
  let leaveStart: string | null = null, leaveEnd: string | null = null;
  if (p.data.kind === 'leave') {
    if (!p.data.leaveStart) return bad(reply, 'İzin için başlangıç tarihi gerekli');
    leaveStart = p.data.leaveStart;
    leaveEnd = p.data.leaveEnd ?? p.data.leaveStart;
    if (leaveEnd < leaveStart) return bad(reply, 'Bitiş tarihi başlangıçtan önce olamaz');
  }
  const emp = await prisma.employee.findUnique({ where: { id: req.user.sub } });
  // Talep önce çalışanın şubesinin müdürüne (kiosk) düşer
  await prisma.request.create({ data: {
    employeeId: req.user.sub, kind: p.data.kind, type: p.data.type, detail: p.data.detail,
    leaveStart, leaveEnd,
    branchId: emp?.branchId ?? null, stage: 'manager',
  } });
  return { ok: true };
});

// Onaylı izin günleri (YYYY-MM-DD kümesi) — belirli aralıkta
const dKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Vardiya baş/bitiş saatini bugünün (İstanbul) mutlak zamanına çevir — gece vardiyası iş gününe göre çapalanır.
// Sunucu TZ=Europe/Istanbul olduğundan new Date()/setHours İstanbul yerel saatidir.
function shiftInstants(shift: { start: string; end: string; overnight: boolean } | null | undefined, now = new Date()): { startAt: string | null; endAt: string | null } {
  if (!shift) return { startAt: null, endAt: null };
  const toMin = (s: string) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
  // İş günü çapası: gece vardiyasında ve şu an öğleden önceyse, vardiya dün başlamıştır.
  const anchor = new Date(now);
  if (shift.overnight && now.getHours() < 12) anchor.setDate(anchor.getDate() - 1);
  const [sh, sm] = shift.start.split(':').map(Number);
  const [eh, em] = shift.end.split(':').map(Number);
  const startAt = new Date(anchor); startAt.setHours(sh, sm, 0, 0);
  const endAt = new Date(anchor); endAt.setHours(eh, em, 0, 0);
  if (shift.overnight && toMin(shift.end) <= toMin(shift.start)) endAt.setDate(endAt.getDate() + 1);
  return { startAt: startAt.toISOString(), endAt: endAt.toISOString() };
}
async function approvedLeaveDays(empId: number, startKey?: string, endKey?: string): Promise<Set<string>> {
  const reqs = await prisma.request.findMany({ where: { employeeId: empId, kind: 'leave', status: 'approved', NOT: { leaveStart: null } } });
  const set = new Set<string>();
  for (const r of reqs) {
    if (!r.leaveStart || !r.leaveEnd) continue;
    let d = new Date(r.leaveStart + 'T00:00:00');
    const end = new Date(r.leaveEnd + 'T00:00:00');
    while (d <= end) {
      const k = dKey(d);
      if ((!startKey || k >= startKey) && (!endKey || k <= endKey)) set.add(k);
      d = new Date(d.getTime() + 86400000);
    }
  }
  return set;
}
async function isOnApprovedLeave(empId: number, dateKey: string): Promise<boolean> {
  const r = await prisma.request.findFirst({ where: { employeeId: empId, kind: 'leave', status: 'approved', leaveStart: { lte: dateKey }, leaveEnd: { gte: dateKey } } });
  return !!r;
}

// Tatil günleri (YYYY-MM-DD → {ad, tür, çalışacak şube id'leri}) — belirli aralıkta
type HolidayInfo = { name: string; type: string; working: number[] };
async function holidayDays(startKey?: string, endKey?: string): Promise<Map<string, HolidayInfo>> {
  const where: any = {};
  if (startKey || endKey) where.date = { ...(startKey ? { gte: startKey } : {}), ...(endKey ? { lte: endKey } : {}) };
  const rows = await prisma.holiday.findMany({ where });
  const m = new Map<string, HolidayInfo>();
  for (const r of rows) {
    let working: number[] = [];
    try { working = JSON.parse(r.workingBranchIds || '[]'); } catch { /* boş */ }
    m.set(r.date, { name: r.name, type: r.type, working });
  }
  return m;
}

// SLA: müdür bu kadar günde karar vermezse talep admin'e eskale olur
const REQUEST_SLA_DAYS = 2;
function effectiveStage(r: { stage: string; createdAt: Date; branchId: number | null }): string {
  if (r.stage !== 'manager') return r.stage;
  if (r.branchId == null) return 'admin'; // şubesiz → doğrudan admin
  const ageDays = (Date.now() - +new Date(r.createdAt)) / 86400000;
  return ageDays > REQUEST_SLA_DAYS ? 'admin' : 'manager';
}

/* ───────── YÖNETİCİ (web) ───────── */
app.get('/api/dashboard', { preHandler: requireAdmin }, async () => {
  const [branches, active, pending, todayPunches] = await Promise.all([
    prisma.branch.findMany({ orderBy: { id: 'asc' } }),
    prisma.employee.count({ where: { status: 'active' } }),
    prisma.employee.count({ where: { status: 'pending' } }),
    prisma.punch.findMany({ where: { serverTime: { gte: startOfToday() } }, select: { branchId: true, status: true, source: true } }),
  ]);
  // Şube başına bugün: okutma sayısı, bayraklı (review) ve manuel (asistlı) sayıları — gerçek
  const agg: Record<number, { c: number; f: number; m: number }> = {};
  for (const p of todayPunches) { const t = (agg[p.branchId] ||= { c: 0, f: 0, m: 0 }); t.c++; if (p.status === 'review') t.f++; if (p.source === 'manual') t.m++; }
  const branchList = branches.map(b => ({ id: b.id, name: b.name, city: b.city, online: true, sync: 'şimdi', today: agg[b.id]?.c || 0, flagged: agg[b.id]?.f || 0, anomaly: agg[b.id]?.m || 0 }));
  return {
    stats: { branches: branches.length, activeEmployees: active, pendingEmployees: pending, todayPunches: todayPunches.length },
    branches: branchList,
  };
});

app.get('/api/employees', { preHandler: requireAdmin }, async () => {
  const emps = await prisma.employee.findMany({ include: { branch: true }, orderBy: { id: 'asc' } });
  const todayKey = dKey(new Date());
  const onLeave = await prisma.request.findMany({
    where: { kind: 'leave', status: 'approved', leaveStart: { lte: todayKey }, leaveEnd: { gte: todayKey } },
    select: { employeeId: true },
  });
  const leaveSet = new Set(onLeave.map(r => r.employeeId));
  const balances = await annualLeaveBalances(new Date().getFullYear());
  return emps.map(e => ({ ...publicEmployee(e), onLeaveToday: leaveSet.has(e.id), leave: leaveBalanceOf(balances, e.id, e.annualLeaveDays ?? 14) }));
});

app.post('/api/employees/:id/approve', { preHandler: requireAdmin }, async (req: any, reply) => {
  const id = Number(req.params.id);
  const emp = await prisma.employee.findUnique({ where: { id } });
  if (!emp) return reply.code(404).send({ error: 'Çalışan bulunamadı' });
  const sicil = emp.sicil || await nextSicil();
  const updated = await prisma.employee.update({ where: { id }, data: { status: 'active', sicil } });
  await prisma.auditLog.create({ data: { actor: req.user.role || 'admin', kind: 'onay', action: 'Kayıt onaylandı', detail: `${emp.name} · sicil ${sicil}` } });
  return publicEmployee(updated);
});

app.get('/api/punches/today', { preHandler: requireAdmin }, async () => {
  const punches = await prisma.punch.findMany({
    where: { serverTime: { gte: startOfToday() } },
    include: { employee: true, branch: true, device: true }, orderBy: { serverTime: 'asc' },
  });
  return punches.map(p => ({
    id: p.id, name: p.employee.name, branch: p.branch.name, dept: p.employee.dept,
    action: p.action, time: p.serverTime, status: p.status, source: p.source,
    device: p.device ? (p.device.label || p.device.code) : null,
  }));
});

app.get('/api/requests', { preHandler: requireAdmin }, async () => {
  const reqs = await prisma.request.findMany({ include: { employee: { include: { branch: true } } }, orderBy: { createdAt: 'desc' } });
  const balances = await annualLeaveBalances(new Date().getFullYear());
  return reqs.map(r => {
    const eff = effectiveStage(r);
    const escalated = r.stage === 'manager' && eff === 'admin' && r.branchId != null;
    // Yıllık izin taleplerinde, onaylayanın kararına yardımcı olmak için çalışanın bakiyesi
    const leave = r.kind === 'leave' && r.type === 'Yıllık izin'
      ? leaveBalanceOf(balances, r.employeeId, r.employee.annualLeaveDays ?? 14) : null;
    return {
      id: r.id, name: r.employee.name, branch: r.employee.branch?.name ?? null, kind: r.kind, type: r.type, detail: r.detail,
      leaveStart: r.leaveStart, leaveEnd: r.leaveEnd, leave,
      status: r.status, stage: eff, escalated, managerRec: r.managerRec, managerNote: r.managerNote, createdAt: r.createdAt,
    };
  });
});

/* ───────── ŞUBE / KIOSK ───────── */
async function requireBranch(req: any, reply: any) {
  const r = await auth(req, reply, 'branch' as any);
  if (reply.sent) return r;
  // Token bir cihaza bağlıysa ve o cihaz iptal edildiyse, çalışan oturumu da anında düşsün.
  const devId = (req.user as any).deviceId;
  if (devId) {
    const dev = await prisma.device.findUnique({ where: { id: devId } });
    if (!dev || dev.status === 'revoked') return reply.code(403).send({ error: 'Bu cihaz uzaktan iptal edildi. Oturum sonlandırıldı.' });
  }
}
async function requireBranchOrAdmin(req: any, reply: any) {
  try { await req.jwtVerify(); } catch { return reply.code(401).send({ error: 'Oturum gerekli' }); }
  const k = (req.user as JwtUser).kind;
  if (k !== 'branch' && k !== 'admin') return reply.code(403).send({ error: 'Yetkisiz' });
}
function hmd(d: Date) { return new Date(d).toTimeString().slice(0, 5); }

// Kiosk gizli doğrulaması: panelden belirlenen kiosk PIN'i (managerPin, düz metin) VEYA eski şube şifresi (yedek)
const isPlainPin = (s?: string | null) => !!s && !String(s).startsWith('$2');
async function branchSecretOk(br: { passwordHash: string | null; managerPin: string | null } | null, secret: string): Promise<boolean> {
  if (!br) return false;
  if (isPlainPin(br.managerPin) && secret === br.managerPin) return true;
  if (br.passwordHash && (await bcrypt.compare(secret, br.passwordHash))) return true;
  return false;
}

app.post('/api/branch/login', { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } }, async (req, reply) => {
  const p = z.object({ username: z.string().min(1), password: z.string().min(1), deviceCode: z.string().optional() }).safeParse(req.body);
  if (!p.success) return bad(reply, 'Kullanıcı adı ve şifre gerekli');
  const br = await prisma.branch.findUnique({ where: { username: p.data.username } });
  if (!br || !(await branchSecretOk(br, p.data.password)))
    return reply.code(401).send({ error: 'Kiosk PIN’i (veya şube şifresi) hatalı' });

  // Cihaz kimliği gönderildiyse: bu şubeye ait + iptal edilmemiş olmalı.
  let device: { id: number; code: string; backup: boolean } | null = null;
  if (p.data.deviceCode) {
    const dev = await prisma.device.findUnique({ where: { code: p.data.deviceCode } });
    if (!dev || dev.branchId !== br.id) return reply.code(403).send({ error: 'Bu cihaz bu şubeye tanımlı değil' });
    if (dev.status === 'revoked') return reply.code(403).send({ error: 'Bu cihaz uzaktan iptal edilmiş. Kiosk açılamaz; yöneticinizle iletişime geçin.' });
    device = { id: dev.id, code: dev.code, backup: dev.backup };
  }

  const token = app.jwt.sign({ sub: br.id, kind: 'branch', deviceId: device?.id }, { expiresIn: TOKEN_TTL });
  return {
    token,
    branch: { id: br.id, name: br.name, city: br.city, lat: br.lat, lng: br.lng },
    device: device ? { code: device.code, role: device.backup ? 'backup' : 'primary' } : null,
  };
});

// Kiosk ilk kurulum: tabletin GPS'ini şube merkezi (geofence) olarak kaydet.
// Güvenlik: yalnızca şubenin henüz konumu yoksa otomatik yazar (force ile override panelden).
app.post('/api/branch/location', { preHandler: requireBranch }, async (req: any, reply) => {
  const p = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180), force: z.boolean().optional() }).safeParse(req.body);
  if (!p.success) return bad(reply, 'Geçerli konum gerekli');
  const br = await prisma.branch.findUnique({ where: { id: req.user.sub } });
  if (!br) return reply.code(404).send({ error: 'Şube bulunamadı' });
  if (br.lat != null && br.lng != null && !p.data.force)
    return { ok: true, set: false, lat: br.lat, lng: br.lng }; // zaten tanımlı, dokunma
  const u = await prisma.branch.update({ where: { id: br.id }, data: { lat: p.data.lat, lng: p.data.lng } });
  await prisma.auditLog.create({ data: { actor: 'şube', kind: 'cihaz', action: 'Şube konumu kaydedildi', detail: `${u.name} · ${p.data.lat.toFixed(5)}, ${p.data.lng.toFixed(5)}` } });
  return { ok: true, set: true, lat: u.lat, lng: u.lng };
});

// Kiosk müdür inceleme — bugün gelenler (çalışan bazında özet)
// Şubenin EN SON okutması — kiosk bunu ~2sn'de bir yoklar; yeni okutmada çalışanın foto+adıyla "Hoş geldin" gösterir
app.get('/api/branch/last-punch', { preHandler: requireBranch }, async (req: any) => {
  const last = await prisma.punch.findFirst({
    where: { branchId: req.user.sub }, orderBy: { serverTime: 'desc' }, include: { employee: true },
  });
  if (!last) return { punch: null };
  return { punch: { id: last.id, empId: last.employeeId, name: last.employee?.name ?? '', avatar: last.employee?.avatar ?? null, action: last.action, time: last.serverTime } };
});

app.get('/api/branch/today', { preHandler: requireBranch }, async (req: any) => {
  const punches = await prisma.punch.findMany({
    where: { branchId: req.user.sub, serverTime: { gte: startOfToday() } },
    include: { employee: true, device: true }, orderBy: { serverTime: 'asc' },
  });
  const byEmp = new Map<number, typeof punches>();
  for (const p of punches) { const a = byEmp.get(p.employeeId) || []; a.push(p); byEmp.set(p.employeeId, a as any); }
  return [...byEmp.entries()].map(([eid, ps]) => {
    const st = statusFromPunches(ps);
    const firstEnter = ps.find(p => p.action === 'enter');
    const lastExit = [...ps].reverse().find(p => p.action === 'exit');
    const last = ps[ps.length - 1];
    const dev = (last as any).device;
    return {
      empId: eid, name: ps[0].employee.name, dept: ps[0].employee.dept,
      in: firstEnter ? hmd(firstEnter.serverTime) : null,
      out: st.status === 'outside' && lastExit ? hmd(lastExit.serverTime) : null,
      status: st.status, lastPunchId: last.id, reviewState: last.status,
      device: dev ? (dev.label || dev.code) : null,
    };
  });
});

// Okutma kaydı onay / itiraz (şube müdürü veya admin)
app.post('/api/punches/:id/review', { preHandler: requireBranchOrAdmin }, async (req: any, reply) => {
  const id = Number(req.params.id);
  const p = z.object({ status: z.enum(['ok', 'disputed']) }).safeParse(req.body);
  if (!p.success) return bad(reply, 'Geçersiz durum');
  // Şube yalnızca KENDİ basışını inceleyebilir (cross-branch IDOR koruması); admin hepsini.
  const existing = await prisma.punch.findUnique({ where: { id } });
  if (!existing) return reply.code(404).send({ error: 'Kayıt bulunamadı' });
  if (req.user.kind === 'branch' && existing.branchId !== req.user.sub)
    return reply.code(403).send({ error: 'Bu kayıt sizin şubenize ait değil' });
  const punch = await prisma.punch.update({ where: { id }, data: { status: p.data.status === 'disputed' ? 'review' : 'confirmed' }, include: { employee: true } });
  await prisma.auditLog.create({ data: {
    actor: req.user.kind === 'branch' ? 'Şube müdürü' : (req.user.role || 'admin'),
    kind: p.data.status === 'disputed' ? 'itiraz' : 'onay',
    action: p.data.status === 'disputed' ? 'Kayıt itirazlı işaretlendi' : 'Kayıt onaylandı',
    detail: punch.employee.name,
  } });
  return { ok: true };
});

/* ───────── TALEPLER ───────── */
app.get('/api/requests/mine', { preHandler: requireEmployee }, async (req: any) => {
  const rs = await prisma.request.findMany({ where: { employeeId: req.user.sub }, orderBy: { createdAt: 'desc' } });
  return rs.map(r => ({ id: r.id, kind: r.kind, type: r.type, detail: r.detail, status: r.status, createdAt: r.createdAt }));
});

async function decideRequest(req: any, reply: any, status: 'approved' | 'rejected') {
  const id = Number(req.params.id);
  const r = await prisma.request.findUnique({ where: { id }, include: { employee: true } });
  if (!r) return reply.code(404).send({ error: 'Talep bulunamadı' });
  if (r.stage === 'done') return bad(reply, 'Talep zaten sonuçlanmış');
  // Düzeltme talepleri müdürde biter; admin yalnızca admin kademesindeki (izin/eskale) talepleri sonuçlandırır (gözetim hariç override).
  await prisma.request.update({ where: { id }, data: { status, stage: 'done' } });
  await prisma.auditLog.create({ data: { actor: req.user.role || 'admin', kind: 'onay', action: status === 'approved' ? 'Talep onaylandı (admin)' : 'Talep reddedildi (admin)', detail: `${r.employee.name} · ${r.type}` } });
  return { ok: true };
}
app.post('/api/requests/:id/approve', { preHandler: requireAdmin }, (req, reply) => decideRequest(req, reply, 'approved'));
app.post('/api/requests/:id/reject', { preHandler: requireAdmin }, (req, reply) => decideRequest(req, reply, 'rejected'));

// Toplu onay/ret: birden çok talebi tek seferde sonuçlandır (yalnız hâlâ sonuçlanmamış olanlar)
app.post('/api/requests/bulk-decide', { preHandler: requireAdmin }, async (req: any, reply) => {
  const p = z.object({ ids: z.array(z.number().int()).min(1).max(200), decision: z.enum(['approve', 'reject']) }).safeParse(req.body);
  if (!p.success) return bad(reply, 'Geçersiz toplu işlem');
  const status = p.data.decision === 'approve' ? 'approved' : 'rejected';
  let done = 0, skipped = 0;
  for (const id of p.data.ids) {
    const r = await prisma.request.findUnique({ where: { id }, include: { employee: true } });
    if (!r || r.stage === 'done') { skipped++; continue; }
    await prisma.request.update({ where: { id }, data: { status, stage: 'done' } });
    await prisma.auditLog.create({ data: { actor: req.user.role || 'admin', kind: 'onay', action: status === 'approved' ? 'Talep onaylandı (toplu)' : 'Talep reddedildi (toplu)', detail: `${r.employee.name} · ${r.type}` } });
    done++;
  }
  return { ok: true, done, skipped };
});

/* ───────── DENETİM KAYDI ───────── */
app.get('/api/audit', { preHandler: requireAdmin }, async () => {
  const a = await prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
  return a.map(x => ({ id: x.id, actor: x.actor, kind: x.kind, action: x.action, detail: x.detail, time: x.createdAt }));
});

/* ───────── VARDİYA ───────── */
app.get('/api/shifts', { preHandler: requireAdmin }, async () => {
  const shifts = await prisma.shift.findMany({ include: { _count: { select: { employees: true } } }, orderBy: { id: 'asc' } });
  return shifts.map(s => ({ id: s.id, name: s.name, start: s.start, end: s.end, breakMin: s.breakMin, overnight: s.overnight, employees: s._count.employees }));
});

/* ───────── PUANTAJ (timesheet) ───────── */
function shiftOpts(shift?: any): DayOpts { const overnight = !!shift?.overnight; return { overnight, expectedMin: shiftExpectedMin(shift), todayKey: workDayKey(new Date(), overnight) }; }

async function employeeTimesheet(empId: number, start: Date, end: Date, label: string) {
  const emp = await prisma.employee.findUnique({ where: { id: empId }, include: { shift: true } });
  const punches = await prisma.punch.findMany({ where: { employeeId: empId, serverTime: { gte: start, lt: end } }, orderBy: { serverTime: 'asc' }, include: { device: true } });
  const opts = shiftOpts(emp?.shift);
  const days = dailyRecords(punches, opts) as any[];
  // Her güne, o günkü ilk giriş okutmasının ekranını (cihazını) iliştir
  const entryDev = new Map<string, string>();
  for (const p of punches) {
    if (p.action !== 'enter') continue;
    const k = workDayKey(p.serverTime, opts.overnight);
    const d = (p as any).device;
    if (!entryDev.has(k) && d) entryDev.set(k, d.label || d.code);
  }
  for (const r of days) r.device = entryDev.get(r.date) ?? null;

  // ── Onaylı izin günlerini puantaja işle (izinli) ──
  const startKey = dKey(start);
  const endKeyExcl = dKey(new Date(end.getTime() - 86400000)); // end üst sınır hariç → son dahil gün
  const leaveSet = await approvedLeaveDays(empId, startKey, endKeyExcl);
  const have = new Set(days.map(r => r.date));
  for (const r of days) if (leaveSet.has(r.date)) { r.status = 'leave'; r.estimated = false; r.inProgress = false; r.flagged = false; }
  for (const k of leaveSet) if (!have.has(k)) {
    days.push({ date: k, day: Number(k.slice(8)), in: null, out: null, breakMin: 0, netMin: 0, diffMin: 0, status: 'leave', flagged: false, estimated: false, inProgress: false, device: null });
  }

  // ── Tatil/bayram günlerini puantaja işle (izin önceliklidir) ──
  const holiSet = await holidayDays(startKey, endKeyExcl);
  const empBranch = emp?.branchId ?? null;
  const haveNow = new Set(days.map(r => r.date));
  for (const r of days) {
    if (r.status === 'leave') continue; // izin önce gelir
    const h = holiSet.get(r.date);
    if (!h) continue;
    const branchWorks = empBranch != null && h.working.includes(empBranch);
    const worked = !!(r.in || r.out); // o gün okutma var mı
    if (worked) { r.status = 'holiday-work'; r.holidayName = h.name; r.flagged = false; }
    else if (!branchWorks) { r.status = 'holiday'; r.holidayName = h.name; r.estimated = false; r.inProgress = false; r.flagged = false; }
    // şube çalışıyor + okutma yok → normal iş günü (overlay yok)
  }
  for (const [k, h] of holiSet) {
    if (haveNow.has(k) || leaveSet.has(k)) continue;
    const branchWorks = empBranch != null && h.working.includes(empBranch);
    if (!branchWorks) { // kapalı tatil, okutma yok → sentetik tatil kaydı
      days.push({ date: k, day: Number(k.slice(8)), in: null, out: null, breakMin: 0, netMin: 0, diffMin: 0, status: 'holiday', flagged: false, estimated: false, inProgress: false, device: null, holidayName: h.name });
    }
  }
  days.sort((a, b) => (a.date < b.date ? -1 : 1));

  const netMin = days.reduce((s, r) => s + r.netMin, 0);
  const overtimeMin = days.reduce((s, r) => s + Math.max(0, r.diffMin), 0);
  const missing = days.filter(r => r.status === 'missing' && !r.inProgress).length;
  const leave = days.filter(r => r.status === 'leave').length;
  const holiday = days.filter(r => r.status === 'holiday').length;
  const holidayWork = days.filter(r => r.status === 'holiday-work').length;
  const present = days.filter(r => r.status !== 'leave' && r.status !== 'holiday').length;
  return { employee: emp ? { id: emp.id, name: emp.name, dept: emp.dept, sicil: emp.sicil } : null, range: label, days, summary: { netMin, overtimeMin, present, missing, leave, holiday, holidayWork } };
}

// Sorgudan dönem aralığı: ?from=&to= (gün bazlı) veya ?month= (aylık) ya da bu ay
const isDate = (v: any) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const MONTHKEY = /^\d{4}-(0[1-9]|1[0-2])$/;
// Geçersiz/eksik ?month → bu ay (NaN Date + Prisma 500/stack sızıntısı yerine güvenli geri dönüş)
const safeMonth = (m: any): string => (typeof m === 'string' && MONTHKEY.test(m)) ? m : currentMonth();
// Şube haftalık açık günleri (getDay(): Paz=0..Cmt=6) — bozuk JSON'da Pzt–Cmt'ye düş
const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5, 6];
const parseWorkingDays = (s: any): number[] => {
  try { const a = JSON.parse(s); return Array.isArray(a) ? a.filter((n: any) => Number.isInteger(n) && n >= 0 && n <= 6) : DEFAULT_WORKING_DAYS; }
  catch { return DEFAULT_WORKING_DAYS; }
};
function rangeFromQuery(q: any): { start: Date; end: Date; label: string } {
  if (isDate(q?.from) && isDate(q?.to)) {
    let a = new Date(q.from + 'T00:00:00'), b = new Date(q.to + 'T00:00:00');
    if (a > b) [a, b] = [b, a];
    const end = new Date(b); end.setDate(end.getDate() + 1); // bitiş günü dahil
    return { start: a, end, label: q.from === q.to ? q.from : `${q.from} – ${q.to}` };
  }
  const month = safeMonth(q?.month);
  const { start, end } = monthRange(month);
  return { start, end, label: month };
}

app.get('/api/employees/:id/timesheet', { preHandler: requireAdmin }, async (req: any) => {
  const { start, end, label } = rangeFromQuery(req.query);
  return employeeTimesheet(Number(req.params.id), start, end, label);
});

// Belirli bir günün bayrağını çöz: o gün 'review' olan okutmaları onayla (ok) veya itirazlı bırak (review)
app.post('/api/employees/:id/resolve-flag', { preHandler: requireAdmin }, async (req: any, reply) => {
  const empId = Number(req.params.id);
  const p = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), action: z.enum(['approve', 'dispute']) }).safeParse(req.body);
  if (!p.success) return bad(reply, p.error.issues[0]?.message || 'Geçersiz veri');
  const emp = await prisma.employee.findUnique({ where: { id: empId } });
  if (!emp) return reply.code(404).send({ error: 'Çalışan bulunamadı' });
  const start = new Date(p.data.date + 'T00:00:00');
  const end = new Date(start); end.setDate(end.getDate() + 1);
  const target = p.data.action === 'approve' ? 'ok' : 'review';
  const upd = await prisma.punch.updateMany({
    where: { employeeId: empId, serverTime: { gte: start, lt: end }, status: { not: target } },
    data: { status: target },
  });
  await prisma.auditLog.create({ data: {
    actor: req.user.role || 'admin',
    kind: p.data.action === 'approve' ? 'onay' : 'itiraz',
    action: p.data.action === 'approve' ? 'Bayraklı kayıt onaylandı' : 'Kayıt itirazlı işaretlendi',
    detail: `${emp.name} · ${p.data.date}`,
  } });
  return { ok: true, changed: upd.count };
});

app.get('/api/branch/employee/:id/timesheet', { preHandler: requireBranch }, async (req: any, reply) => {
  const emp = await prisma.employee.findUnique({ where: { id: Number(req.params.id) } });
  if (!emp || emp.branchId !== req.user.sub) return reply.code(404).send({ error: 'Çalışan bu şubede değil' });
  const month = safeMonth(req.query?.month);
  const { start, end } = monthRange(month);
  return employeeTimesheet(emp.id, start, end, month);
});

app.get('/api/branch/employees', { preHandler: requireBranch }, async (req: any) => {
  const emps = await prisma.employee.findMany({ where: { branchId: req.user.sub, status: 'active' }, orderBy: { name: 'asc' } });
  return emps.map(e => ({ id: e.id, name: e.name, dept: e.dept }));
});

// Müdür (kiosk) — bu şubeye düşen bekleyen talepler
app.get('/api/branch/requests', { preHandler: requireBranch }, async (req: any) => {
  const reqs = await prisma.request.findMany({
    where: { branchId: req.user.sub, status: 'pending' }, include: { employee: true }, orderBy: { createdAt: 'asc' },
  });
  // Yalnızca hâlâ müdür kademesinde olanlar (SLA aşımıyla admin'e geçenler düşer)
  return reqs.filter(r => effectiveStage(r) === 'manager')
    .map(r => ({ id: r.id, name: r.employee.name, dept: r.employee.dept, kind: r.kind, type: r.type, detail: r.detail, leaveStart: r.leaveStart, leaveEnd: r.leaveEnd, createdAt: r.createdAt }));
});

// Müdür kararı: düzeltme → kesin; izin → öneri + not, admin'e iletilir
app.post('/api/branch/requests/:id/decide', { preHandler: requireBranch }, async (req: any, reply) => {
  const id = Number(req.params.id);
  const p = z.object({ decision: z.enum(['approve', 'reject']), note: z.string().max(280).optional() }).safeParse(req.body);
  if (!p.success) return bad(reply, 'Geçersiz karar');
  const r = await prisma.request.findUnique({ where: { id }, include: { employee: true } });
  if (!r) return reply.code(404).send({ error: 'Talep bulunamadı' });
  if (r.branchId !== req.user.sub) return reply.code(403).send({ error: 'Bu talep sizin şubenize ait değil' });
  if (effectiveStage(r) !== 'manager') return bad(reply, 'Bu talep artık müdür kademesinde değil');

  const note = p.data.note?.trim() || null;
  if (r.kind === 'fix') {
    // Düzeltme: müdür kesin karar verir
    const status = p.data.decision === 'approve' ? 'approved' : 'rejected';
    await prisma.request.update({ where: { id }, data: { status, stage: 'done', managerRec: p.data.decision, managerNote: note, managerDecidedAt: new Date() } });
    await prisma.auditLog.create({ data: { actor: 'Şube müdürü', kind: 'onay', action: status === 'approved' ? 'Düzeltme talebi onaylandı (müdür)' : 'Düzeltme talebi reddedildi (müdür)', detail: `${r.employee.name} · ${r.type}` } });
  } else {
    // İzin: müdür önerir, admin'e iletilir
    await prisma.request.update({ where: { id }, data: { stage: 'admin', managerRec: p.data.decision, managerNote: note, managerDecidedAt: new Date() } });
    await prisma.auditLog.create({ data: { actor: 'Şube müdürü', kind: 'onay', action: p.data.decision === 'approve' ? 'İzin talebine müdür görüşü: uygundur' : 'İzin talebine müdür görüşü: uygun değil', detail: `${r.employee.name} · ${r.type}` } });
  }
  return { ok: true };
});

app.post('/api/branch/verify-pin', { preHandler: requireBranch, config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (req: any, reply) => {
  const p = z.object({ pin: z.string() }).safeParse(req.body);
  if (!p.success) return bad(reply, 'PIN gerekli');
  // İnceleme moduna giriş: şubenin admin'ce belirlenen statik kiosk PIN'i (panelde görünür/değişir)
  const br = await prisma.branch.findUnique({ where: { id: req.user.sub } });
  const ok = !!br?.managerPin && p.data.pin === br.managerPin;
  return { ok };
});

// Kiosk modundan çıkış: şube parolasını tekrar doğrula (kiosk'u açan parolanın aynısı)
app.post('/api/branch/verify-password', { preHandler: requireBranch, config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (req: any, reply) => {
  const p = z.object({ password: z.string().min(1) }).safeParse(req.body);
  if (!p.success) return bad(reply, 'Parola gerekli');
  const br = await prisma.branch.findUnique({ where: { id: req.user.sub } });
  const ok = await branchSecretOk(br, p.data.password); // kiosk PIN'i veya eski şube şifresi
  return { ok };
});

app.post('/api/branch/manual-punch', { preHandler: requireBranch, config: { rateLimit: { max: 30, timeWindow: '1 minute' } } }, async (req: any, reply) => {
  const p = z.object({ employeeId: z.number().int(), action: z.enum(['enter', 'exit', 'break-out', 'break-in']), reason: z.string().min(1) }).safeParse(req.body);
  if (!p.success) return bad(reply, 'Eksik bilgi');
  const emp = await prisma.employee.findUnique({ where: { id: p.data.employeeId } });
  if (!emp || emp.branchId !== req.user.sub) return reply.code(404).send({ error: 'Çalışan bu şubede değil' });
  await prisma.punch.create({ data: { employeeId: emp.id, branchId: req.user.sub, action: p.data.action, source: 'manual' } });
  await prisma.auditLog.create({ data: { actor: 'Şube müdürü', kind: 'manuel', action: 'Asistlı manuel okutma', detail: `${emp.name} · ${p.data.action} · ${p.data.reason}` } });
  return { ok: true };
});

/* ───────── ÇALIŞAN YÖNETİMİ (admin) ───────── */
// Referans (FK) doğrulaması — olmayan branchId/shiftId Prisma 500 (P2003) yerine temiz 400 döndürür.
async function assertFk(reply: any, branchId?: number | null, shiftId?: number | null): Promise<boolean> {
  if (branchId != null && !(await prisma.branch.findUnique({ where: { id: branchId } }))) { bad(reply, 'Geçersiz şube'); return false; }
  if (shiftId != null && !(await prisma.shift.findUnique({ where: { id: shiftId } }))) { bad(reply, 'Geçersiz vardiya'); return false; }
  return true;
}
app.post('/api/employees', { preHandler: requireAdmin }, async (req: any, reply) => {
  const p = z.object({ name: z.string().min(2), tc: z.string().regex(/^\d{11}$/), dept: z.string().optional(), role: z.string().optional(), branchId: z.number().int().optional(), shiftId: z.number().int().optional(), annualLeaveDays: z.number().int().min(0).max(60).optional(), startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'İşe giriş tarihi YYYY-AA-GG olmalı').optional(), password: z.string().min(8, 'Şifre en az 8 karakter olmalı') }).safeParse(req.body);
  if (!p.success) return bad(reply, p.error.issues[0]?.message || 'Geçersiz veri');
  if (!isValidTC(p.data.tc)) return bad(reply, 'Geçersiz TC kimlik numarası');
  if (!(await assertFk(reply, p.data.branchId, p.data.shiftId))) return;
  if (await prisma.employee.findUnique({ where: { tc: p.data.tc } })) return bad(reply, 'Bu TC ile kayıt zaten var');
  const emp = await prisma.employee.create({ data: { name: p.data.name, tc: p.data.tc, dept: p.data.dept, role: p.data.role, branchId: p.data.branchId ?? null, shiftId: p.data.shiftId ?? null, annualLeaveDays: p.data.annualLeaveDays ?? 14, startDate: p.data.startDate ? new Date(p.data.startDate + 'T12:00:00Z') : null, passwordHash: await bcrypt.hash(p.data.password, 10), status: 'active', sicil: await nextSicil() } });
  await prisma.auditLog.create({ data: { actor: req.user.role || 'admin', kind: 'cihaz', action: 'Çalışan eklendi', detail: emp.name } });
  return publicEmployee(emp);
});

app.patch('/api/employees/:id', { preHandler: requireAdmin }, async (req: any, reply) => {
  const id = Number(req.params.id);
  const emp = await prisma.employee.findUnique({ where: { id } });
  if (!emp) return reply.code(404).send({ error: 'Çalışan bulunamadı' });
  const p = z.object({
    name: z.string().min(2).optional(),
    dept: z.string().optional().nullable(),
    role: z.string().optional().nullable(),
    branchId: z.number().int().nullable().optional(),
    shiftId: z.number().int().nullable().optional(),
    isManager: z.boolean().optional(),
    annualLeaveDays: z.number().int().min(0).max(60).optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'İşe giriş tarihi YYYY-AA-GG olmalı').nullable().optional(),
  }).safeParse(req.body);
  if (!p.success) return bad(reply, p.error.issues[0]?.message || 'Geçersiz veri');
  if (!(await assertFk(reply, p.data.branchId, p.data.shiftId))) return;
  const data: any = {};
  for (const k of ['name', 'dept', 'role', 'branchId', 'shiftId', 'isManager', 'annualLeaveDays'] as const) {
    if (p.data[k] !== undefined) data[k] = p.data[k];
  }
  if (p.data.startDate !== undefined) data.startDate = p.data.startDate ? new Date(p.data.startDate + 'T12:00:00Z') : null;
  const updated = await prisma.employee.update({ where: { id }, data, include: { branch: true } });
  await prisma.auditLog.create({ data: { actor: req.user.role || 'admin', kind: 'cihaz', action: 'Çalışan bilgileri güncellendi', detail: updated.name } });
  return publicEmployee(updated);
});

app.post('/api/employees/:id/offboard', { preHandler: requireAdmin }, async (req: any, reply) => {
  const id = Number(req.params.id);
  const emp = await prisma.employee.findUnique({ where: { id } });
  if (!emp) return reply.code(404).send({ error: 'Çalışan bulunamadı' });
  const p = z.object({
    exitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Çıkış tarihi YYYY-AA-GG olmalı'),
    reason: z.string().max(280).optional(),
  }).safeParse(req.body);
  if (!p.success) return bad(reply, p.error.issues[0]?.message || 'Geçersiz veri');
  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.employee.update({ where: { id }, data: {
      status: 'offboarding', exitDate: new Date(p.data.exitDate + 'T12:00:00Z'), exitReason: p.data.reason?.trim() || null,
    }, include: { branch: true } });
    // Açık (bekleyen) izin/düzeltme taleplerini otomatik kapat.
    await tx.request.updateMany({ where: { employeeId: id, status: 'pending' }, data: { status: 'rejected' } });
    return u;
  });
  await prisma.auditLog.create({ data: { actor: req.user.role || 'admin', kind: 'cihaz', action: 'Çıkış sürecine alındı', detail: `${emp.name} · çıkış ${p.data.exitDate}${p.data.reason ? ' · ' + p.data.reason.trim() : ''}` } });
  return publicEmployee(updated);
});

app.post('/api/employees/:id/reactivate', { preHandler: requireAdmin }, async (req: any, reply) => {
  const id = Number(req.params.id);
  const emp = await prisma.employee.findUnique({ where: { id } });
  if (!emp) return reply.code(404).send({ error: 'Çalışan bulunamadı' });
  const updated = await prisma.employee.update({ where: { id }, data: { status: 'active', exitDate: null, exitReason: null }, include: { branch: true } });
  await prisma.auditLog.create({ data: { actor: req.user.role || 'admin', kind: 'cihaz', action: 'İşe geri alındı', detail: emp.name } });
  return publicEmployee(updated);
});

app.post('/api/employee/change-password', { preHandler: requireEmployee }, async (req: any, reply) => {
  const p = z.object({ current: z.string().min(1), next: z.string().min(8) }).safeParse(req.body);
  if (!p.success) return bad(reply, 'Yeni şifre en az 8 karakter olmalı');
  const emp = await prisma.employee.findUnique({ where: { id: req.user.sub } });
  if (!emp || !(await bcrypt.compare(p.data.current, emp.passwordHash))) return reply.code(401).send({ error: 'Mevcut şifre hatalı' });
  await prisma.employee.update({ where: { id: emp.id }, data: { passwordHash: await bcrypt.hash(p.data.next, 10) } });
  return { ok: true };
});

// Profil fotoğrafı yükle/kaldır (data URL base64). Kioskta okutmada görünür.
app.post('/api/employee/avatar', { preHandler: requireEmployee, config: { rateLimit: { max: 20, timeWindow: '1 minute' } } }, async (req: any, reply) => {
  const p = z.object({ avatar: z.string().max(700000).nullable() }).safeParse(req.body); // ~500KB data URL üst sınırı
  if (!p.success) return bad(reply, 'Fotoğraf çok büyük veya geçersiz (en fazla ~500KB)');
  if (p.data.avatar && !/^data:image\/(png|jpe?g|webp);base64,/.test(p.data.avatar)) return bad(reply, 'Geçersiz görsel formatı');
  await prisma.employee.update({ where: { id: req.user.sub }, data: { avatar: p.data.avatar } });
  return { ok: true };
});

app.post('/api/employee/forgot', { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, async (req, reply) => {
  const p = z.object({ tc: z.string(), phone: z.string().optional() }).safeParse(req.body);
  if (!p.success) return bad(reply, 'TC gerekli');
  const emp = await prisma.employee.findUnique({ where: { tc: p.data.tc } });
  if (emp) await prisma.auditLog.create({ data: { actor: 'Sistem', kind: 'kvkk', action: 'Şifre sıfırlama talebi', detail: `${emp.name} · yönetici sıfırlaması bekliyor` } });
  return { ok: true };  // varlık sızdırma yok
});

/* ───────── ŞUBE / CİHAZ / VARDİYA YÖNETİMİ (admin) ───────── */
app.post('/api/branches', { preHandler: requireAdmin }, async (req: any, reply) => {
  const p = z.object({ name: z.string().min(2), city: z.string().optional(), username: z.string().min(3), password: z.string().min(8, 'Şifre en az 8 karakter olmalı'), kioskPin: z.string().regex(/^\d{4,6}$/, 'Kiosk PIN 4-6 haneli olmalı').optional() }).safeParse(req.body);
  if (!p.success) return bad(reply, p.error.issues[0]?.message || 'Geçersiz veri');
  if (await prisma.branch.findUnique({ where: { username: p.data.username } })) return bad(reply, 'Bu kullanıcı adı kullanılıyor');
  const br = await prisma.branch.create({ data: { name: p.data.name, city: p.data.city, username: p.data.username, passwordHash: await bcrypt.hash(p.data.password, 10), managerPin: p.data.kioskPin || '1234' } });
  const n = await prisma.device.count();
  await prisma.device.create({ data: { branchId: br.id, code: `TBL-${String(300 + (n * 17) % 9600).padStart(4, '0')}` } });
  await prisma.auditLog.create({ data: { actor: req.user.role || 'admin', kind: 'cihaz', action: 'Şube eklendi', detail: br.name } });
  return { id: br.id, name: br.name };
});

// Şube konumu / bilgileri — kiosk geofence merkezi panelden ayarlanır.
app.patch('/api/branches/:id', { preHandler: requireAdmin }, async (req: any, reply) => {
  const id = Number(req.params.id);
  const br = await prisma.branch.findUnique({ where: { id } });
  if (!br) return reply.code(404).send({ error: 'Şube bulunamadı' });
  const p = z.object({
    name: z.string().min(2).optional(),
    city: z.string().optional().nullable(),
    lat: z.number().min(-90).max(90).nullable().optional(),
    lng: z.number().min(-180).max(180).nullable().optional(),
    radius: z.number().int().min(20).max(5000).optional(),
    workingDays: z.array(z.number().int().min(0).max(6)).optional(),
    kioskPin: z.string().regex(/^\d{4,6}$/, 'Kiosk PIN 4-6 haneli olmalı').optional(),
  }).safeParse(req.body);
  if (!p.success) return bad(reply, p.error.issues[0]?.message || 'Geçersiz veri');
  const data: any = {};
  for (const k of ['name', 'city', 'lat', 'lng', 'radius'] as const) if (p.data[k] !== undefined) data[k] = p.data[k];
  if (p.data.workingDays !== undefined) data.workingDays = JSON.stringify([...new Set(p.data.workingDays)].sort((a, b) => a - b));
  if (p.data.kioskPin !== undefined) data.managerPin = p.data.kioskPin;
  const updated = await prisma.branch.update({ where: { id }, data });
  const wdDone = p.data.workingDays !== undefined;
  await prisma.auditLog.create({ data: { actor: req.user.role || 'admin', kind: 'cihaz', action: 'Şube bilgileri güncellendi', detail: `${updated.name}${data.lat != null ? ` · konum ${data.lat.toFixed(5)}, ${data.lng?.toFixed(5)}` : ''}${data.radius != null ? ` · sınır ${data.radius} m` : ''}${wdDone ? ` · çalışma günleri güncellendi` : ''}` } });
  return { id: updated.id, name: updated.name, city: updated.city, lat: updated.lat, lng: updated.lng, radius: updated.radius, workingDays: parseWorkingDays((updated as any).workingDays) };
});

app.get('/api/devices', { preHandler: requireAdmin }, async () => {
  const devs = await prisma.device.findMany({ include: { branch: true }, orderBy: { id: 'asc' } });
  return devs.map(d => ({ id: d.id, code: d.code, label: d.label, branchId: d.branchId, branch: d.branch.name, city: d.branch.city, mode: d.branch.mode === 'kiosk' ? 'Sabit kiosk' : d.branch.mode, status: d.status }));
});

app.post('/api/devices', { preHandler: requireAdmin }, async (req: any, reply) => {
  const p = z.object({ branchId: z.number().int(), label: z.string().max(40).optional() }).safeParse(req.body);
  if (!p.success) return bad(reply, 'Şube gerekli');
  if (!(await assertFk(reply, p.data.branchId))) return;
  const n = await prisma.device.count();
  const dev = await prisma.device.create({ data: { branchId: p.data.branchId, label: p.data.label?.trim() || null, code: `TBL-${String(300 + (n * 17) % 9600).padStart(4, '0')}` } });
  await prisma.auditLog.create({ data: { actor: req.user.role || 'admin', kind: 'cihaz', action: 'Cihaz eşlendi', detail: `${dev.code}${dev.label ? ' · ' + dev.label : ''}` } });
  return { id: dev.id, code: dev.code };
});

// Cihaz etiketi (kullanım yeri) güncelle
app.patch('/api/devices/:id', { preHandler: requireAdmin }, async (req: any, reply) => {
  const id = Number(req.params.id);
  const dev = await prisma.device.findUnique({ where: { id } });
  if (!dev) return reply.code(404).send({ error: 'Cihaz bulunamadı' });
  const p = z.object({ label: z.string().max(40).optional().nullable() }).safeParse(req.body);
  if (!p.success) return bad(reply, 'Geçersiz veri');
  const updated = await prisma.device.update({ where: { id }, data: { label: p.data.label?.trim() || null } });
  await prisma.auditLog.create({ data: { actor: req.user.role || 'admin', kind: 'cihaz', action: 'Cihaz bilgileri güncellendi', detail: `${updated.code}${updated.label ? ' · ' + updated.label : ''}` } });
  return { id: updated.id, code: updated.code, label: updated.label };
});

app.post('/api/devices/:id/revoke', { preHandler: requireAdmin }, async (req: any, reply) => {
  const id = Number(req.params.id);
  const dev = await prisma.device.findUnique({ where: { id } });
  if (!dev) return reply.code(404).send({ error: 'Cihaz bulunamadı' });
  if (dev.status === 'revoked') return bad(reply, 'Cihaz zaten iptal edilmiş');
  // Şubeyi basışsız bırakmamak için: son aktif cihaz iptal edilemez (önce ikinci cihaz eşle).
  const otherActive = await prisma.device.count({ where: { branchId: dev.branchId, status: 'active', id: { not: id } } });
  if (otherActive === 0) return bad(reply, 'Bu, şubenin tek aktif cihazı. İptal etmeden önce şubeye ikinci bir cihaz eşleyin.');
  await prisma.device.update({ where: { id }, data: { status: 'revoked' } });
  await prisma.auditLog.create({ data: { actor: req.user.role || 'admin', kind: 'cihaz', action: 'Cihaz uzaktan iptal edildi', detail: dev.code } });
  return { ok: true };
});

app.post('/api/devices/:id/reactivate', { preHandler: requireAdmin }, async (req: any, reply) => {
  const id = Number(req.params.id);
  const dev = await prisma.device.findUnique({ where: { id } });
  if (!dev) return reply.code(404).send({ error: 'Cihaz bulunamadı' });
  await prisma.device.update({ where: { id }, data: { status: 'active' } });
  await prisma.auditLog.create({ data: { actor: req.user.role || 'admin', kind: 'cihaz', action: 'Cihaz yeniden etkinleştirildi', detail: dev.code } });
  return { ok: true };
});

app.post('/api/shifts', { preHandler: requireAdmin }, async (req: any, reply) => {
  const p = z.object({ name: z.string().min(2), start: z.string().regex(HHMM, 'Başlangıç saati HH:MM olmalı'), end: z.string().regex(HHMM, 'Bitiş saati HH:MM olmalı'), breakMin: z.number().int().min(0).max(600).optional(), overnight: z.boolean().optional() }).safeParse(req.body);
  if (!p.success) return bad(reply, p.error.issues[0]?.message || 'Geçersiz vardiya');
  const s = await prisma.shift.create({ data: { name: p.data.name, start: p.data.start, end: p.data.end, breakMin: p.data.breakMin ?? 60, overnight: p.data.overnight ?? false } });
  return { id: s.id, name: s.name };
});

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
app.patch('/api/shifts/:id', { preHandler: requireAdmin }, async (req: any, reply) => {
  const id = Number(req.params.id);
  const sh = await prisma.shift.findUnique({ where: { id } });
  if (!sh) return reply.code(404).send({ error: 'Vardiya bulunamadı' });
  const p = z.object({
    name: z.string().min(2).optional(),
    start: z.string().regex(HHMM, 'Başlangıç saati HH:MM olmalı').optional(),
    end: z.string().regex(HHMM, 'Bitiş saati HH:MM olmalı').optional(),
    breakMin: z.number().int().min(0).max(600).optional(),
    overnight: z.boolean().optional(),
  }).safeParse(req.body);
  if (!p.success) return bad(reply, p.error.issues[0]?.message || 'Geçersiz vardiya');
  const data: any = {};
  for (const k of ['name', 'start', 'end', 'breakMin', 'overnight'] as const) if (p.data[k] !== undefined) data[k] = p.data[k];
  const updated = await prisma.shift.update({ where: { id }, data });
  await prisma.auditLog.create({ data: { actor: req.user.role || 'admin', kind: 'cihaz', action: 'Vardiya güncellendi', detail: `${updated.name} · ${updated.start}–${updated.end}` } });
  return { id: updated.id, name: updated.name, start: updated.start, end: updated.end, breakMin: updated.breakMin, overnight: updated.overnight };
});

app.delete('/api/shifts/:id', { preHandler: requireAdmin }, async (req: any, reply) => {
  const id = Number(req.params.id);
  const sh = await prisma.shift.findUnique({ where: { id } });
  if (!sh) return reply.code(404).send({ error: 'Vardiya bulunamadı' });
  const assigned = await prisma.employee.count({ where: { shiftId: id } });
  if (assigned > 0) return bad(reply, `Bu vardiyaya atanmış ${assigned} çalışan var. Önce çalışanları başka vardiyaya alın.`);
  await prisma.shift.delete({ where: { id } });
  await prisma.auditLog.create({ data: { actor: req.user.role || 'admin', kind: 'cihaz', action: 'Vardiya silindi', detail: sh.name } });
  return { ok: true };
});

/* ───────── RESMİ/DİNİ TATİLLER (admin) ───────── */
// TR resmi (sabit) + dini (kayan) bayram tarihleri. Dini tarihler resmi takvime göre; admin düzenleyebilir.
const TR_RELIGIOUS: Record<number, { date: string; name: string }[]> = {
  2026: [
    { date: '2026-03-20', name: 'Ramazan Bayramı 1. Gün' }, { date: '2026-03-21', name: 'Ramazan Bayramı 2. Gün' }, { date: '2026-03-22', name: 'Ramazan Bayramı 3. Gün' },
    { date: '2026-05-27', name: 'Kurban Bayramı 1. Gün' }, { date: '2026-05-28', name: 'Kurban Bayramı 2. Gün' }, { date: '2026-05-29', name: 'Kurban Bayramı 3. Gün' }, { date: '2026-05-30', name: 'Kurban Bayramı 4. Gün' },
  ],
  2027: [
    { date: '2027-03-10', name: 'Ramazan Bayramı 1. Gün' }, { date: '2027-03-11', name: 'Ramazan Bayramı 2. Gün' }, { date: '2027-03-12', name: 'Ramazan Bayramı 3. Gün' },
    { date: '2027-05-16', name: 'Kurban Bayramı 1. Gün' }, { date: '2027-05-17', name: 'Kurban Bayramı 2. Gün' }, { date: '2027-05-18', name: 'Kurban Bayramı 3. Gün' }, { date: '2027-05-19', name: 'Kurban Bayramı 4. Gün' },
  ],
};
function trHolidays(year: number): { date: string; name: string; type: string }[] {
  const y = year;
  const official: { date: string; name: string; type: string }[] = [
    { date: `${y}-01-01`, name: 'Yılbaşı' }, { date: `${y}-04-23`, name: 'Ulusal Egemenlik ve Çocuk Bayramı' },
    { date: `${y}-05-01`, name: 'Emek ve Dayanışma Günü' }, { date: `${y}-05-19`, name: "Atatürk'ü Anma, Gençlik ve Spor Bayramı" },
    { date: `${y}-07-15`, name: 'Demokrasi ve Millî Birlik Günü' }, { date: `${y}-08-30`, name: 'Zafer Bayramı' },
    { date: `${y}-10-29`, name: 'Cumhuriyet Bayramı' },
  ].map(h => ({ ...h, type: 'resmi' }));
  const religious = (TR_RELIGIOUS[y] || []).map(h => ({ ...h, type: 'dini' }));
  return [...official, ...religious];
}
async function importHolidaysForYear(year: number): Promise<number> {
  let added = 0;
  for (const h of trHolidays(year)) {
    if (await prisma.holiday.findUnique({ where: { date: h.date } })) continue;
    await prisma.holiday.create({ data: { date: h.date, name: h.name, type: h.type, workingBranchIds: '[]' } });
    added++;
  }
  return added;
}

app.get('/api/holidays', { preHandler: requireAdmin }, async () => {
  const rows = await prisma.holiday.findMany({ orderBy: { date: 'asc' } });
  const branches = await prisma.branch.findMany({ select: { id: true, name: true } });
  const bn = new Map(branches.map(b => [b.id, b.name]));
  return rows.map(r => {
    let working: number[] = []; try { working = JSON.parse(r.workingBranchIds || '[]'); } catch { /* boş */ }
    return { id: r.id, date: r.date, name: r.name, type: r.type, workingBranchIds: working, workingBranchNames: working.map(id => bn.get(id)).filter(Boolean) };
  });
});

app.post('/api/holidays', { preHandler: requireAdmin }, async (req: any, reply) => {
  const p = z.object({ date: z.string().regex(DATEKEY), name: z.string().min(2), type: z.enum(['resmi', 'dini', 'custom']), workingBranchIds: z.array(z.number().int()).optional() }).safeParse(req.body);
  if (!p.success) return bad(reply, p.error.issues[0]?.message || 'Geçersiz veri');
  if (!isRealDate(p.data.date)) return bad(reply, 'Geçersiz tarih');
  if (await prisma.holiday.findUnique({ where: { date: p.data.date } })) return bad(reply, 'Bu tarihte zaten bir tatil tanımlı');
  const h = await prisma.holiday.create({ data: { date: p.data.date, name: p.data.name, type: p.data.type, workingBranchIds: JSON.stringify(p.data.workingBranchIds ?? []) } });
  await prisma.auditLog.create({ data: { actor: req.user.role || 'admin', kind: 'cihaz', action: 'Tatil eklendi', detail: `${h.date} · ${h.name}` } });
  return { id: h.id };
});

app.patch('/api/holidays/:id', { preHandler: requireAdmin }, async (req: any, reply) => {
  const id = Number(req.params.id);
  const cur = await prisma.holiday.findUnique({ where: { id } });
  if (!cur) return reply.code(404).send({ error: 'Tatil bulunamadı' });
  const p = z.object({ date: z.string().regex(DATEKEY).optional(), name: z.string().min(2).optional(), type: z.enum(['resmi', 'dini', 'custom']).optional(), workingBranchIds: z.array(z.number().int()).optional() }).safeParse(req.body);
  if (!p.success) return bad(reply, p.error.issues[0]?.message || 'Geçersiz veri');
  if (p.data.date && !isRealDate(p.data.date)) return bad(reply, 'Geçersiz tarih');
  const data: any = {};
  if (p.data.date !== undefined) data.date = p.data.date;
  if (p.data.name !== undefined) data.name = p.data.name;
  if (p.data.type !== undefined) data.type = p.data.type;
  if (p.data.workingBranchIds !== undefined) data.workingBranchIds = JSON.stringify(p.data.workingBranchIds);
  const upd = await prisma.holiday.update({ where: { id }, data });
  return { id: upd.id };
});

app.delete('/api/holidays/:id', { preHandler: requireAdmin }, async (req: any, reply) => {
  const id = Number(req.params.id);
  const h = await prisma.holiday.findUnique({ where: { id } });
  if (!h) return reply.code(404).send({ error: 'Tatil bulunamadı' });
  await prisma.holiday.delete({ where: { id } });
  await prisma.auditLog.create({ data: { actor: req.user.role || 'admin', kind: 'cihaz', action: 'Tatil silindi', detail: `${h.date} · ${h.name}` } });
  return { ok: true };
});

app.post('/api/holidays/import', { preHandler: requireAdmin }, async (req: any, reply) => {
  const p = z.object({ year: z.number().int().min(2020).max(2100) }).safeParse(req.body);
  if (!p.success) return bad(reply, 'Yıl gerekli');
  const added = await importHolidaysForYear(p.data.year);
  await prisma.auditLog.create({ data: { actor: req.user.role || 'admin', kind: 'cihaz', action: 'Tatiller içe aktarıldı', detail: `${p.data.year} · ${added} eklendi` } });
  return { added, total: trHolidays(p.data.year).length, religiousIncluded: !!TR_RELIGIOUS[p.data.year] };
});

// Açılışta tatil takvimi boşsa içinde bulunulan yıl + sonraki yılı otomatik doldur ("sen otomatik at")
(async () => {
  try {
    if (await prisma.holiday.count() === 0) {
      const y = new Date().getFullYear();
      await importHolidaysForYear(y);
      await importHolidaysForYear(y + 1);
    }
  } catch { /* yoksay */ }
})();

app.post('/api/data-requests/:id/done', { preHandler: requireAdmin }, async (req: any, reply) => {
  const id = Number(req.params.id);
  if (!(await prisma.dataRequest.findUnique({ where: { id } }))) return reply.code(404).send({ error: 'Talep bulunamadı' });
  const dr = await prisma.dataRequest.update({ where: { id }, data: { status: 'done' }, include: { employee: true } });
  await prisma.auditLog.create({ data: { actor: req.user.role || 'admin', kind: 'kvkk', action: 'İlgili kişi talebi tamamlandı', detail: `${dr.employee.name} · ${dr.type}` } });
  return { ok: true };
});

// DSAR detayı — erişim talebinde çalışanın kişisel veri dökümünü üretir
app.get('/api/data-requests/:id', { preHandler: requireAdmin }, async (req: any, reply) => {
  const dr = await prisma.dataRequest.findUnique({
    where: { id: Number(req.params.id) },
    include: { employee: { include: { branch: true, shift: true, consents: true } } },
  });
  if (!dr) return reply.code(404).send({ error: 'Talep bulunamadı' });
  const e = dr.employee;
  const base = { id: dr.id, type: dr.type, status: dr.status, note: dr.note, createdAt: dr.createdAt, employee: { id: e.id, name: e.name } };
  if (dr.type !== 'access') return base; // düzeltme/silme: veri dökümü yok, sadece talep + not

  const punches = await prisma.punch.findMany({ where: { employeeId: e.id }, orderBy: { serverTime: 'desc' }, take: 300, include: { branch: true } });
  const requests = await prisma.request.findMany({ where: { employeeId: e.id }, orderBy: { createdAt: 'desc' } });
  const dataPackage = {
    olusturuldu: new Date().toISOString(),
    kvkk_surumu: await getKvkkVersion(),
    kimlik: { ad_soyad: e.name, tc: e.tc, telefon: e.phone, adres: e.address, departman: e.dept, gorev: e.role, sicil: e.sicil, durum: e.status, ise_baslama: e.startDate, sube: e.branch?.name ?? null, vardiya: e.shift?.name ?? null },
    riza_gecmisi: e.consents.sort((a, b) => +b.acceptedAt - +a.acceptedAt).map(c => ({ surum: c.version, kabul_tarihi: c.acceptedAt })),
    basis_kayitlari: punches.map(p => ({ zaman: p.serverTime, eylem: p.action, kaynak: p.source, durum: p.status, sube: p.branch?.name ?? null })),
    izin_duzeltme_talepleri: requests.map(r => ({ tur: r.kind === 'leave' ? 'İzin' : 'Düzeltme', baslik: r.type, detay: r.detail, durum: r.status, tarih: r.createdAt })),
  };
  return { ...base, package: dataPackage };
});

// Puantaj & Mesai — bayraklı kayıtlar + haftalık 45 saat
app.get('/api/timesheet', { preHandler: requireAdmin }, async (req: any) => {
  const month = safeMonth(req.query?.month);
  const { start, end } = monthRange(month);
  const emps = await prisma.employee.findMany({ where: { status: 'active' }, include: { branch: true, shift: true }, orderBy: { name: 'asc' } });
  const employees: any[] = [];
  const flagged: any[] = [];
  const overtimeWeeks: any[] = [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  for (const emp of emps) {
    const punches = await prisma.punch.findMany({ where: { employeeId: emp.id, serverTime: { gte: start, lt: end } }, orderBy: { serverTime: 'asc' } });
    const days = dailyRecords(punches, shiftOpts(emp.shift));
    let netMin = 0, overtimeMin = 0, missing = 0, flaggedCount = 0;
    for (const r of days) {
      netMin += r.netMin;
      overtimeMin += Math.max(0, r.diffMin);
      if (r.status === 'missing' && !r.inProgress) missing++;
      if (r.flagged) flaggedCount++;
      if ((r.status === 'missing' && !r.inProgress) || r.status === 'over' || r.flagged) {
        const age = Math.floor((+today - +new Date(r.date)) / 86400000);
        flagged.push({ empId: emp.id, name: emp.name, branch: emp.branch?.name, date: r.date, day: r.day, status: r.status, flagged: r.flagged, netMin: r.netMin, diffMin: r.diffMin, ageDays: age });
      }
    }
    employees.push({ id: emp.id, name: emp.name, branch: emp.branch?.name ?? null, dept: emp.dept, sicil: emp.sicil, avatar: emp.avatar ?? null, present: days.length, netMin, overtimeMin, missing, flaggedCount });
    const byWeek = new Map<string, number>();
    for (const r of days) { const w = weekKey(new Date(r.date)); byWeek.set(w, (byWeek.get(w) || 0) + r.netMin); }
    for (const [w, min] of byWeek) if (min > 45 * 60) overtimeWeeks.push({ name: emp.name, week: w, hours: +(min / 60).toFixed(1) });
  }
  const allBranches = await prisma.branch.findMany({ orderBy: { id: 'asc' } });
  const branches = allBranches.map(b => ({ name: b.name, workingDays: parseWorkingDays((b as any).workingDays) }));
  return { month, employees, flagged, overtimeWeeks, branches };
});

/* ───────── ANOMALİ ───────── */
app.get('/api/anomalies', { preHandler: requireAdmin }, async () => {
  const cfg = await getRiskCfg();
  const { start, end } = monthRange(currentMonth());
  const emps = await prisma.employee.findMany({ where: { status: 'active' }, include: { branch: true, shift: true } });
  const out: any[] = [];
  for (const emp of emps) {
    const punches = await prisma.punch.findMany({ where: { employeeId: emp.id, serverTime: { gte: start, lt: end } }, orderBy: { serverTime: 'asc' } });
    const days = dailyRecords(punches, shiftOpts(emp.shift));
    const startMin = emp.shift ? toMin(emp.shift.start) : 540;
    for (const r of days) {
      if (r.flagged) out.push({ name: emp.name, branch: emp.branch?.name, type: 'Mükerrer/itirazlı kayıt', ctx: 'Yöneticce itirazlı işaretlendi', risk: 86, when: r.date });
      else if (r.status === 'missing' && !r.inProgress) out.push({ name: emp.name, branch: emp.branch?.name, type: 'Eksik çıkış', ctx: 'Çıkış okutması yok', risk: 48, when: r.date });
      else if (r.in && toMin(r.in) > startMin + cfg.lateToleranceMin) out.push({ name: emp.name, branch: emp.branch?.name, type: 'Geç giriş', ctx: `Vardiya ${emp.shift?.start} · giriş ${r.in}`, risk: 40, when: r.date });
      if (r.netMin > cfg.longShiftHours * 60) out.push({ name: emp.name, branch: emp.branch?.name, type: 'Uzun mesai', ctx: `Net ${Math.round(r.netMin / 60)} saat`, risk: 56, when: r.date });
    }
  }
  return { threshold: cfg.bandHigh, rows: out.sort((a, b) => b.risk - a.risk).slice(0, 20) };
});

// Çalışan risk skoru — şeffaf, ağırlıklı model (gerçek basış verisinden)
// Risk faktörlerinin gösterim bilgisi + varsayılan puanları (etiket/açıklama kodda, puan ayarlanabilir)
const RISK_META = [
  { key: 'review', label: 'İtirazlı / mükerrer kayıt', hint: 'Yöneticce itirazlı işaretlenen veya incelemedeki okutma', def: 25 },
  { key: 'missing', label: 'Eksik çıkış', hint: 'Çıkış okutması yapılmamış gün', def: 15 },
  { key: 'manual', label: 'Manuel (asistlı) okutma', hint: 'Tabletten yönetici/asistan eliyle girilen basış', def: 12 },
  { key: 'late', label: 'Geç giriş', hint: 'Vardiya başlangıcından tolerans+ sonra giriş', def: 8 },
  { key: 'long', label: 'Olağandışı uzun mesai', hint: 'Uzun mesai eşiğini aşan gün', def: 6 },
] as const;
type RiskCfg = { weights: Record<string, number>; bandHigh: number; bandMid: number; lateToleranceMin: number; longShiftHours: number };
const DEFAULT_RISK_CFG: RiskCfg = {
  weights: Object.fromEntries(RISK_META.map(m => [m.key, m.def])),
  bandHigh: 70, bandMid: 40, lateToleranceMin: 15, longShiftHours: 11,
};
async function getRiskCfg(): Promise<RiskCfg> {
  const row = await prisma.setting.findUnique({ where: { key: 'risk-config' } });
  if (!row) return DEFAULT_RISK_CFG;
  try { const v = JSON.parse(row.value); return { ...DEFAULT_RISK_CFG, ...v, weights: { ...DEFAULT_RISK_CFG.weights, ...(v.weights || {}) } }; }
  catch { return DEFAULT_RISK_CFG; }
}
const bandsOf = (cfg: RiskCfg) => [
  { key: 'high', label: 'Yüksek', min: cfg.bandHigh, tone: 'err' },
  { key: 'mid', label: 'Orta', min: cfg.bandMid, tone: 'warn' },
  { key: 'low', label: 'Düşük', min: 1, tone: 'neu' },
  { key: 'clean', label: 'Temiz', min: 0, tone: 'ok' },
];
const bandKeyOf = (score: number, cfg: RiskCfg) => bandsOf(cfg).find(b => score >= b.min)!.key;

app.get('/api/risk-scores', { preHandler: requireAdmin }, async () => {
  const cfg = await getRiskCfg();
  const month = currentMonth();
  const { start, end } = monthRange(month);
  const emps = await prisma.employee.findMany({ where: { status: 'active' }, include: { branch: true, shift: true } });
  const employees: any[] = [];
  for (const emp of emps) {
    const punches = await prisma.punch.findMany({ where: { employeeId: emp.id, serverTime: { gte: start, lt: end } }, orderBy: { serverTime: 'asc' } });
    const days = dailyRecords(punches, shiftOpts(emp.shift));
    const startMin = emp.shift ? toMin(emp.shift.start) : 540;
    const f = { review: 0, missing: 0, manual: 0, late: 0, long: 0 };
    for (const r of days) {
      if (r.flagged) f.review++;
      if (r.status === 'missing' && !r.inProgress) f.missing++;
      if (r.in && toMin(r.in) > startMin + cfg.lateToleranceMin) f.late++;
      if (r.netMin > cfg.longShiftHours * 60) f.long++;
    }
    f.manual = punches.filter(p => p.source === 'manual').length;
    const score = Math.min(100, RISK_META.reduce((s, m) => s + (f as any)[m.key] * (cfg.weights[m.key] ?? 0), 0));
    employees.push({ id: emp.id, name: emp.name, branch: emp.branch?.name ?? null, dept: emp.dept, sicil: emp.sicil, score, level: bandKeyOf(score, cfg), factors: f });
  }
  employees.sort((a, b) => b.score - a.score);
  return { month, weights: RISK_META.map(m => ({ ...m, points: cfg.weights[m.key] ?? m.def })), bands: bandsOf(cfg), employees };
});

// Güvenlik ayarları — risk ağırlıkları/bantları/eşikleri (yönetici ayarlar)
app.get('/api/risk-settings', { preHandler: requireAdmin }, async () => {
  const cfg = await getRiskCfg();
  return { meta: RISK_META, defaults: DEFAULT_RISK_CFG, config: cfg };
});

app.put('/api/risk-settings', { preHandler: requireAdmin }, async (req: any, reply) => {
  const p = z.object({
    weights: z.record(z.string(), z.number().int().min(0).max(100)),
    bandHigh: z.number().int().min(1).max(100),
    bandMid: z.number().int().min(1).max(100),
    lateToleranceMin: z.number().int().min(0).max(180),
    longShiftHours: z.number().int().min(1).max(24),
  }).safeParse(req.body);
  if (!p.success) return bad(reply, p.error.issues[0]?.message || 'Geçersiz ayar');
  if (p.data.bandMid >= p.data.bandHigh) return bad(reply, 'Orta band, Yüksek banttan küçük olmalı');
  const cfg: RiskCfg = {
    weights: Object.fromEntries(RISK_META.map(m => [m.key, p.data.weights[m.key] ?? DEFAULT_RISK_CFG.weights[m.key]])),
    bandHigh: p.data.bandHigh, bandMid: p.data.bandMid, lateToleranceMin: p.data.lateToleranceMin, longShiftHours: p.data.longShiftHours,
  };
  await prisma.setting.upsert({ where: { key: 'risk-config' }, create: { key: 'risk-config', value: JSON.stringify(cfg) }, update: { value: JSON.stringify(cfg) } });
  await prisma.auditLog.create({ data: { actor: req.user.role || 'admin', kind: 'cihaz', action: 'Güvenlik ayarları güncellendi', detail: `bant Y${cfg.bandHigh}/O${cfg.bandMid} · geç ${cfg.lateToleranceMin}dk · uzun ${cfg.longShiftHours}s` } });
  return { ok: true, config: cfg };
});

/* ───────── PERFORMANS DEĞERLENDİRMESİ (yıllık) ───────── */
// Kriter şablonu — org geneli, özelleştirilebilir. risk-config deseninin aynısı (Setting'te JSON).
type EvalCrit = { id: string; label: string; hint?: string; category?: string; weight: number; kind: 'manual' | 'auto' };
const DEFAULT_EVAL_CRITERIA: EvalCrit[] = [
  { id: 'kilik', label: 'Kılık-kıyafet & temsil', hint: 'Görünüm, üniforma, genel temsil', category: 'Davranış', weight: 1, kind: 'manual' },
  { id: 'iletisim', label: 'Müşteri iletişimi', hint: 'Nezaket, çözüm odaklılık, iletişim becerisi', category: 'Davranış', weight: 2, kind: 'manual' },
  { id: 'ekip', label: 'Ekip çalışması', hint: 'Uyum, yardımlaşma, bilgi paylaşımı', category: 'Davranış', weight: 1, kind: 'manual' },
  { id: 'kalite', label: 'İş kalitesi & titizlik', hint: 'Doğruluk, özen, standartlara uyum', category: 'İş', weight: 2, kind: 'manual' },
  { id: 'uyum', label: 'Kurallara uyum', hint: 'Prosedür, güvenlik ve disipline uyum', category: 'İş', weight: 1, kind: 'manual' },
  { id: 'devam', label: 'Devam & dakiklik', hint: 'Puantajdan otomatik (geç giriş / eksik çıkış / bayraklı kayıt)', category: 'Devam', weight: 2, kind: 'auto' },
];
async function getEvalCriteria(): Promise<EvalCrit[]> {
  const row = await prisma.setting.findUnique({ where: { key: 'eval-criteria' } });
  if (!row) return DEFAULT_EVAL_CRITERIA;
  try { const v = JSON.parse(row.value); return Array.isArray(v) && v.length ? v : DEFAULT_EVAL_CRITERIA; }
  catch { return DEFAULT_EVAL_CRITERIA; }
}
const evalSafeScores = (s: any): Record<string, number> => { try { const v = JSON.parse(s); return v && typeof v === 'object' ? v : {}; } catch { return {}; } };
const clampYear = (y: any): number => { const n = parseInt(y, 10); const cur = new Date().getFullYear(); return Number.isFinite(n) ? Math.max(2000, Math.min(cur + 1, n)) : cur; };

// Otomatik "Devam & dakiklik" skoru (0–100) — o yılın puantajından, yıllık ceza ağırlıklarıyla.
const ATT_PEN = { flagged: 8, missing: 4, late: 1.5, manual: 1 } as const;
async function attendanceScore(emp: any, year: number): Promise<{ score: number; breakdown: Record<string, number> }> {
  const start = new Date(year, 0, 1), end = new Date(year + 1, 0, 1);
  const cfg = await getRiskCfg();
  const punches = await prisma.punch.findMany({ where: { employeeId: emp.id, serverTime: { gte: start, lt: end } }, orderBy: { serverTime: 'asc' } });
  const days = dailyRecords(punches, shiftOpts(emp.shift));
  const startMin = emp.shift ? toMin(emp.shift.start) : 540;
  const b = { flagged: 0, missing: 0, late: 0, manual: 0 };
  for (const r of days) {
    if (r.flagged) b.flagged++;
    if (r.status === 'missing' && !r.inProgress) b.missing++;
    if (r.in && toMin(r.in) > startMin + cfg.lateToleranceMin) b.late++;
  }
  b.manual = punches.filter(p => p.source === 'manual').length;
  const penalty = b.flagged * ATT_PEN.flagged + b.missing * ATT_PEN.missing + b.late * ATT_PEN.late + b.manual * ATT_PEN.manual;
  return { score: Math.max(0, Math.round(100 - Math.min(100, penalty))), breakdown: b };
}

// Genel skor = Σ(ağırlık × kriterPuanı₀₋₁₀₀) / Σağırlık. Yıldız 1–5 → ((r-1)/4)*100; auto zaten 0–100.
function evalOverall(scores: Record<string, number>, criteria: EvalCrit[], autoScore: number): number | null {
  let wsum = 0, vsum = 0;
  for (const c of criteria) {
    let v: number | null = null;
    if (c.kind === 'auto') v = autoScore;
    else { const r = Number(scores?.[c.id]); if (r >= 1 && r <= 5) v = ((r - 1) / 4) * 100; }
    if (v == null) continue;
    const w = Number(c.weight) || 0; if (w <= 0) continue;
    wsum += w; vsum += w * v;
  }
  return wsum > 0 ? Math.round(vsum / wsum) : null;
}

app.get('/api/eval-criteria', { preHandler: requireAdmin }, async () => {
  return { criteria: await getEvalCriteria(), defaults: DEFAULT_EVAL_CRITERIA };
});

app.put('/api/eval-criteria', { preHandler: requireAdmin }, async (req: any, reply) => {
  const p = z.object({
    criteria: z.array(z.object({
      id: z.string().min(1).max(40).regex(/^[a-z0-9_-]+$/i, 'id yalnız harf/rakam/-/_ içerebilir'),
      label: z.string().min(1).max(80),
      hint: z.string().max(160).optional(),
      category: z.string().max(40).optional(),
      weight: z.number().min(0).max(20),
      kind: z.enum(['manual', 'auto']),
    })).min(1).max(30),
  }).safeParse(req.body);
  if (!p.success) return bad(reply, p.error.issues[0]?.message || 'Geçersiz kriterler');
  if (!p.data.criteria.some(c => c.kind === 'auto')) return bad(reply, 'En az bir otomatik (devam) kriteri olmalı');
  const ids = new Set<string>();
  for (const c of p.data.criteria) { if (ids.has(c.id)) return bad(reply, 'Kriter kimliği tekrar ediyor: ' + c.id); ids.add(c.id); }
  await prisma.setting.upsert({ where: { key: 'eval-criteria' }, create: { key: 'eval-criteria', value: JSON.stringify(p.data.criteria) }, update: { value: JSON.stringify(p.data.criteria) } });
  await prisma.auditLog.create({ data: { actor: req.user.role || 'admin', kind: 'performans', action: 'Performans kriterleri güncellendi', detail: `${p.data.criteria.length} kriter` } });
  return { ok: true, criteria: p.data.criteria };
});

app.get('/api/evaluations', { preHandler: requireAdmin }, async (req: any) => {
  const year = clampYear(req.query?.year);
  const criteria = await getEvalCriteria();
  const emps = await prisma.employee.findMany({ where: { status: 'active' }, include: { branch: true, shift: true }, orderBy: { name: 'asc' } });
  const rows = await prisma.evaluation.findMany({ where: { year } });
  const byEmp = new Map(rows.map(r => [r.employeeId, r]));
  const employees: any[] = [];
  for (const emp of emps) {
    const auto = await attendanceScore(emp, year);
    const ev = byEmp.get(emp.id);
    const scores = ev ? evalSafeScores(ev.scores) : {};
    employees.push({
      empId: emp.id, name: emp.name, branch: emp.branch?.name ?? null, dept: emp.dept, avatar: emp.avatar ?? null,
      autoScore: auto.score, overall: evalOverall(scores, criteria, auto.score), status: ev ? ev.status : 'none',
    });
  }
  return { year, criteria, employees };
});

app.get('/api/employees/:id/evaluation', { preHandler: requireAdmin }, async (req: any, reply) => {
  const id = Number(req.params.id);
  const year = clampYear(req.query?.year);
  const emp = await prisma.employee.findUnique({ where: { id }, include: { branch: true, shift: true } });
  if (!emp) return reply.code(404).send({ error: 'Çalışan bulunamadı' });
  const criteria = await getEvalCriteria();
  const ev = await prisma.evaluation.findUnique({ where: { employeeId_year: { employeeId: id, year } } });
  const scores = ev ? evalSafeScores(ev.scores) : {};
  const auto = await attendanceScore(emp, year);
  return {
    year,
    employee: { id: emp.id, name: emp.name, branch: emp.branch?.name ?? null, dept: emp.dept, sicil: emp.sicil, avatar: emp.avatar ?? null },
    criteria, scores, note: ev?.note ?? null, status: ev ? ev.status : 'none', updatedAt: ev?.updatedAt ?? null,
    auto, overall: evalOverall(scores, criteria, auto.score),
  };
});

app.put('/api/employees/:id/evaluation', { preHandler: requireAdmin }, async (req: any, reply) => {
  const id = Number(req.params.id);
  const emp = await prisma.employee.findUnique({ where: { id } });
  if (!emp) return reply.code(404).send({ error: 'Çalışan bulunamadı' });
  const p = z.object({
    year: z.number().int().min(2000).max(2100),
    scores: z.record(z.string(), z.number().int().min(1).max(5)),
    note: z.string().max(2000).optional().nullable(),
    status: z.enum(['draft', 'published']),
  }).safeParse(req.body);
  if (!p.success) return bad(reply, p.error.issues[0]?.message || 'Geçersiz değerlendirme');
  const data = { scores: JSON.stringify(p.data.scores), note: p.data.note?.trim() || null, status: p.data.status, evaluator: req.user.role || 'admin' };
  await prisma.evaluation.upsert({
    where: { employeeId_year: { employeeId: id, year: p.data.year } },
    create: { employeeId: id, year: p.data.year, ...data },
    update: data,
  });
  await prisma.auditLog.create({ data: { actor: req.user.role || 'admin', kind: 'performans', action: p.data.status === 'published' ? 'Performans karnesi yayınlandı' : 'Performans karnesi kaydedildi', detail: `${emp.name} · ${p.data.year}` } });
  return { ok: true };
});

/* ───────── DEĞERLENDİRME DÖNEMLERİ (kiosk yönetici akışı) ───────── */
const parseNumIds = (s: string): number[] => { try { const a = JSON.parse(s); return Array.isArray(a) ? a.filter((n: any) => Number.isInteger(n)) : []; } catch { return []; } };
const parseStrIds = (s: string): string[] => { try { const a = JSON.parse(s); return Array.isArray(a) ? a.filter((x: any) => typeof x === 'string') : []; } catch { return []; } };
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const campaignActiveNow = (c: any, todayKey: string) => c.status === 'active' && c.startDate <= todayKey && todayKey <= c.endDate;

// ── Admin: dönem yönetimi ──
app.get('/api/eval-campaigns', { preHandler: requireAdmin }, async () => {
  const today = dKey(new Date());
  const campaigns = await prisma.evalCampaign.findMany({ orderBy: { createdAt: 'desc' } });
  const criteria = await getEvalCriteria();
  const branches = await prisma.branch.findMany();
  const branchName = new Map(branches.map(b => [b.id, b.name]));
  const out: any[] = [];
  for (const c of campaigns) {
    const branchIds = parseNumIds(c.branchIds);
    const critIds = parseStrIds(c.criteriaIds);
    const targetCount = await prisma.employee.count({ where: { status: 'active', branchId: { in: branchIds.length ? branchIds : [-1] } } });
    const submitted = await prisma.evalCampaignEntry.count({ where: { campaignId: c.id } });
    out.push({
      id: c.id, name: c.name, year: c.year, startDate: c.startDate, endDate: c.endDate,
      status: c.status, active: campaignActiveNow(c, today),
      branchIds, branches: branchIds.map(id => branchName.get(id) ?? `#${id}`),
      criteriaIds: critIds, criteria: critIds.map(id => criteria.find(k => k.id === id)?.label ?? id),
      targetCount, submitted,
    });
  }
  return { campaigns: out };
});

app.post('/api/eval-campaigns', { preHandler: requireAdmin }, async (req: any, reply) => {
  const criteria = await getEvalCriteria();
  const manualIds = new Set(criteria.filter(c => c.kind === 'manual').map(c => c.id));
  const p = z.object({
    name: z.string().min(2).max(80),
    year: z.number().int().min(2000).max(2100),
    startDate: z.string().regex(DATE_RE),
    endDate: z.string().regex(DATE_RE),
    branchIds: z.array(z.number().int()).min(1),
    criteriaIds: z.array(z.string()).min(1),
  }).safeParse(req.body);
  if (!p.success) return bad(reply, p.error.issues[0]?.message || 'Geçersiz dönem');
  if (p.data.endDate < p.data.startDate) return bad(reply, 'Bitiş tarihi başlangıçtan önce olamaz');
  const crit = p.data.criteriaIds.filter(id => manualIds.has(id));
  if (!crit.length) return bad(reply, 'En az bir geçerli (öznel) kriter seçin');
  const created = await prisma.evalCampaign.create({ data: {
    name: p.data.name.trim(), year: p.data.year, startDate: p.data.startDate, endDate: p.data.endDate,
    branchIds: JSON.stringify(p.data.branchIds), criteriaIds: JSON.stringify(crit), status: 'active',
  } });
  await prisma.auditLog.create({ data: { actor: req.user.role || 'admin', kind: 'performans', action: 'Değerlendirme dönemi oluşturuldu', detail: `${created.name} · ${created.startDate}→${created.endDate}` } });
  return { ok: true, id: created.id };
});

app.patch('/api/eval-campaigns/:id', { preHandler: requireAdmin }, async (req: any, reply) => {
  const id = Number(req.params.id);
  const c = await prisma.evalCampaign.findUnique({ where: { id } });
  if (!c) return reply.code(404).send({ error: 'Dönem bulunamadı' });
  const p = z.object({ status: z.enum(['active', 'closed']).optional(), name: z.string().min(2).max(80).optional() }).safeParse(req.body);
  if (!p.success) return bad(reply, 'Geçersiz veri');
  const data: any = {};
  if (p.data.status) data.status = p.data.status;
  if (p.data.name) data.name = p.data.name.trim();
  await prisma.evalCampaign.update({ where: { id }, data });
  if (p.data.status) await prisma.auditLog.create({ data: { actor: req.user.role || 'admin', kind: 'performans', action: p.data.status === 'closed' ? 'Değerlendirme dönemi kapatıldı' : 'Değerlendirme dönemi açıldı', detail: c.name } });
  return { ok: true };
});

app.delete('/api/eval-campaigns/:id', { preHandler: requireAdmin }, async (req: any, reply) => {
  const id = Number(req.params.id);
  const c = await prisma.evalCampaign.findUnique({ where: { id } });
  if (!c) return reply.code(404).send({ error: 'Dönem bulunamadı' });
  await prisma.evalCampaignEntry.deleteMany({ where: { campaignId: id } });
  await prisma.evalCampaign.delete({ where: { id } });
  await prisma.auditLog.create({ data: { actor: req.user.role || 'admin', kind: 'performans', action: 'Değerlendirme dönemi silindi', detail: c.name } });
  return { ok: true };
});

// ── Şube (kiosk) müdürü: aktif dönemler + çalışan başına puanlama ──
app.get('/api/branch/eval-campaigns', { preHandler: requireBranch }, async (req: any) => {
  const today = dKey(new Date());
  const all = await prisma.evalCampaign.findMany({ where: { status: 'active' }, orderBy: { endDate: 'asc' } });
  const mine = all.filter(c => campaignActiveNow(c, today) && parseNumIds(c.branchIds).includes(req.user.sub));
  if (!mine.length) return { campaigns: [] };
  const criteria = await getEvalCriteria();
  const emps = await prisma.employee.findMany({ where: { branchId: req.user.sub, status: 'active' }, orderBy: { name: 'asc' } });
  const out: any[] = [];
  for (const c of mine) {
    const critIds = parseStrIds(c.criteriaIds);
    const crit = critIds.map(id => criteria.find(k => k.id === id)).filter(Boolean);
    const entries = await prisma.evalCampaignEntry.findMany({ where: { campaignId: c.id } });
    const byEmp = new Map(entries.map(e => [e.employeeId, e]));
    out.push({
      id: c.id, name: c.name, year: c.year, endDate: c.endDate, criteria: crit,
      employees: emps.map(e => {
        const ent = byEmp.get(e.id);
        return { id: e.id, name: e.name, dept: e.dept, avatar: e.avatar ?? null, done: !!ent, scores: ent ? evalSafeScores(ent.scores) : {}, note: ent?.note ?? null };
      }),
    });
  }
  return { campaigns: out };
});

app.put('/api/branch/eval-campaigns/:id/employee/:empId', { preHandler: requireBranch }, async (req: any, reply) => {
  const today = dKey(new Date());
  const id = Number(req.params.id), empId = Number(req.params.empId);
  const c = await prisma.evalCampaign.findUnique({ where: { id } });
  if (!c) return reply.code(404).send({ error: 'Dönem bulunamadı' });
  if (!campaignActiveNow(c, today) || !parseNumIds(c.branchIds).includes(req.user.sub)) return reply.code(403).send({ error: 'Bu dönem şu an bu şubede aktif değil' });
  const emp = await prisma.employee.findUnique({ where: { id: empId } });
  if (!emp || emp.branchId !== req.user.sub || emp.status !== 'active') return reply.code(404).send({ error: 'Çalışan bu şubede değil' });
  const p = z.object({ scores: z.record(z.string(), z.number().int().min(1).max(5)), note: z.string().max(2000).optional().nullable() }).safeParse(req.body);
  if (!p.success) return bad(reply, p.error.issues[0]?.message || 'Geçersiz puanlama');
  // Yalnız bu dönemin kriterlerini kabul et
  const allow = new Set(parseStrIds(c.criteriaIds));
  const scores: Record<string, number> = {};
  for (const [k, v] of Object.entries(p.data.scores)) if (allow.has(k)) scores[k] = v;
  const note = p.data.note?.trim() || null;
  // 1) Dönem kaydı (yönetici girdisi, ilerleme takibi)
  await prisma.evalCampaignEntry.upsert({
    where: { campaignId_employeeId: { campaignId: id, employeeId: empId } },
    create: { campaignId: id, employeeId: empId, scores: JSON.stringify(scores), note, evaluator: 'Şube müdürü' },
    update: { scores: JSON.stringify(scores), note, evaluator: 'Şube müdürü' },
  });
  // 2) Yıllık karneye taslak olarak birleştir (İK panelde görür, yayınlar)
  const ev = await prisma.evaluation.findUnique({ where: { employeeId_year: { employeeId: empId, year: c.year } } });
  const merged = { ...(ev ? evalSafeScores(ev.scores) : {}), ...scores };
  const keepStatus = ev?.status === 'published' ? 'published' : 'draft';
  const keepNote = ev?.note || note;
  await prisma.evaluation.upsert({
    where: { employeeId_year: { employeeId: empId, year: c.year } },
    create: { employeeId: empId, year: c.year, scores: JSON.stringify(merged), note: keepNote, status: 'draft', evaluator: 'Şube müdürü' },
    update: { scores: JSON.stringify(merged), note: keepNote, status: keepStatus, evaluator: 'Şube müdürü' },
  });
  await prisma.auditLog.create({ data: { actor: 'Şube müdürü', kind: 'performans', action: 'Yönetici performans değerlendirmesi (kiosk)', detail: `${emp.name} · ${c.name}` } });
  return { ok: true };
});

/* ───────── BORDRO ───────── */
app.get('/api/payroll', { preHandler: requireAdmin }, async () => {
  const month = currentMonth();
  let period = await prisma.payrollPeriod.findUnique({ where: { month } });
  if (!period) period = await prisma.payrollPeriod.create({ data: { month, status: 'open' } });
  const emps = await prisma.employee.findMany({ where: { status: 'active' } });
  const { start, end } = monthRange(month);
  const rows: any[] = [];
  let totalNet = 0, totalOt = 0;
  for (const emp of emps) {
    const ts = await employeeTimesheet(emp.id, start, end, month);
    rows.push({ name: emp.name, sicil: emp.sicil, netMin: ts.summary.netMin, overtimeMin: ts.summary.overtimeMin, days: ts.summary.present, missing: ts.summary.missing });
    totalNet += ts.summary.netMin; totalOt += ts.summary.overtimeMin;
  }
  return { period: { month: period.month, status: period.status, closedAt: period.closedAt }, rows, totals: { netMin: totalNet, overtimeMin: totalOt } };
});

app.post('/api/payroll/close', { preHandler: requireAdmin }, async (req: any) => {
  const month = currentMonth();
  await prisma.payrollPeriod.upsert({ where: { month }, update: { status: 'closed', closedAt: new Date() }, create: { month, status: 'closed', closedAt: new Date() } });
  await prisma.auditLog.create({ data: { actor: req.user.role || 'admin', kind: 'bordro', action: 'Bordro dönemi kapatıldı', detail: month } });
  return { ok: true };
});

/* ───────── RAPORLAR ───────── */
app.get('/api/reports', { preHandler: requireAdmin }, async (req: any) => {
  const cfg = await getRiskCfg();
  const month = safeMonth(req.query?.month);
  const { start, end } = monthRange(month);
  const startKey = dKey(start), endKey = dKey(new Date(end.getTime() - 86400000));
  const emps = await prisma.employee.findMany({ where: { status: 'active' }, include: { shift: true, branch: true } });

  // İzin ve tatil verisini tek seferde yükle (bordro/yasal puantaj kolonları için)
  const leaveReqs = await prisma.request.findMany({ where: { kind: 'leave', status: 'approved', leaveStart: { lte: endKey }, leaveEnd: { gte: startKey } } });
  const leavesByEmp = new Map<number, Set<string>>();
  for (const r of leaveReqs) {
    if (!r.leaveStart || !r.leaveEnd) continue;
    const s = r.leaveStart < startKey ? startKey : r.leaveStart, e = r.leaveEnd > endKey ? endKey : r.leaveEnd;
    let d = new Date(s + 'T00:00:00'); const de = new Date(e + 'T00:00:00');
    const set = leavesByEmp.get(r.employeeId) ?? new Set<string>();
    while (d <= de) { set.add(dKey(d)); d = new Date(d.getTime() + 86400000); }
    leavesByEmp.set(r.employeeId, set);
  }
  const holiMap = await holidayDays(startKey, endKey);

  const rows: any[] = [];
  for (const emp of emps) {
    const punches = await prisma.punch.findMany({ where: { employeeId: emp.id, serverTime: { gte: start, lt: end } }, orderBy: { serverTime: 'asc' } });
    const days = dailyRecords(punches, shiftOpts(emp.shift));
    const startMin = emp.shift ? toMin(emp.shift.start) : 540;
    const net = days.reduce((s, r) => s + r.netMin, 0);
    const ot = days.reduce((s, r) => s + Math.max(0, r.diffMin), 0);
    const late = days.filter(r => r.in && toMin(r.in) > startMin + cfg.lateToleranceMin).length;
    const miss = days.filter(r => r.status === 'missing' && !r.inProgress).length;
    const leaveDays = (leavesByEmp.get(emp.id)?.size) ?? 0;
    // Bu çalışanın şubesi için kapalı tatil gün sayısı (çalışmadığı resmi/dini tatil)
    let holidayDaysCount = 0;
    for (const [, h] of holiMap) { const closed = !(emp.branchId != null && h.working.includes(emp.branchId)); if (closed) holidayDaysCount++; }
    rows.push({
      name: emp.name, sicil: emp.sicil ?? null, branch: emp.branch?.name ?? null, dept: emp.dept ?? null,
      workedDays: days.length, netHours: +(net / 60).toFixed(1), overtimeHours: +(ot / 60).toFixed(1),
      late, missing: miss, leaveDays, holidayDays: holidayDaysCount,
    });
  }
  return { month, rows };
});

/* ───────── KVKK ───────── */
app.get('/api/kvkk', { preHandler: requireAdmin }, async () => {
  const version = await getKvkkVersion();
  const emps = await prisma.employee.findMany({ where: { status: { in: ['active', 'pending'] } }, include: { consents: true } });
  const employees = emps.map(e => {
    const latest = e.consents.sort((a, b) => +b.acceptedAt - +a.acceptedAt)[0];
    const status = !latest ? 'none' : latest.version === version ? 'current' : 'old';
    return { name: e.name, status, version: latest?.version || null, acceptedAt: latest?.acceptedAt || null };
  });
  const drs = await prisma.dataRequest.findMany({ include: { employee: true }, orderBy: { createdAt: 'desc' } });
  const requests = drs.map(r => ({ id: r.id, name: r.employee.name, type: r.type, status: r.status, createdAt: r.createdAt }));
  const document = await getKvkkDoc(version);
  return { version, document, employees, requests };
});

// Aydınlatma metnini güncelle (mevcut sürüm için saklanan metni değiştirir — sürüm artmaz)
app.patch('/api/kvkk/document', { preHandler: requireAdmin }, async (req: any, reply) => {
  const p = z.object({ title: z.string().min(2, 'Başlık en az 2 karakter olmalı'), body: z.string().min(10, 'Metin en az 10 karakter olmalı') }).safeParse(req.body);
  if (!p.success) return bad(reply, p.error.issues[0]?.message || 'Geçersiz veri');
  const version = await getKvkkVersion();
  const updatedAt = new Date().toISOString();
  const value = JSON.stringify({ title: p.data.title.trim(), body: p.data.body, updatedAt });
  await prisma.setting.upsert({ where: { key: kvkkDocKey(version) }, create: { key: kvkkDocKey(version), value }, update: { value } });
  await prisma.auditLog.create({ data: { actor: req.user.role || 'admin', kind: 'kvkk', action: 'Aydınlatma metni güncellendi', detail: `${version} · ${p.data.title.trim()}` } });
  return { version, title: p.data.title.trim(), body: p.data.body, updatedAt };
});

// Yeni sürüm yayınla: yeni sürümü yürürlüğe alır; mevcut rızalar otomatik "Eski sürüm"e düşer
app.post('/api/kvkk/version', { preHandler: requireAdmin }, async (req: any, reply) => {
  const p = z.object({
    version: z.string().trim().min(1, 'Sürüm gerekli').max(20).regex(/^[\w.\-]+$/, 'Sürüm yalnız harf, rakam, nokta ve tire içerebilir'),
    title: z.string().min(2, 'Başlık en az 2 karakter olmalı'),
    body: z.string().min(10, 'Metin en az 10 karakter olmalı'),
  }).safeParse(req.body);
  if (!p.success) return bad(reply, p.error.issues[0]?.message || 'Geçersiz veri');
  const cur = await getKvkkVersion();
  const ver = p.data.version.trim();
  if (ver === cur) return bad(reply, `"${ver}" zaten yürürlükteki sürüm. Metni değiştirmek için "Düzenle" kullanın.`);
  const updatedAt = new Date().toISOString();
  const value = JSON.stringify({ title: p.data.title.trim(), body: p.data.body, updatedAt });
  await prisma.setting.upsert({ where: { key: kvkkDocKey(ver) }, create: { key: kvkkDocKey(ver), value }, update: { value } });
  await prisma.setting.upsert({ where: { key: KVKK_VERSION_KEY }, create: { key: KVKK_VERSION_KEY, value: ver }, update: { value: ver } });
  await prisma.auditLog.create({ data: { actor: req.user.role || 'admin', kind: 'kvkk', action: 'Yeni KVKK sürümü yayınlandı', detail: `${cur} → ${ver} · ${p.data.title.trim()}` } });
  return { version: ver, title: p.data.title.trim(), body: p.data.body, updatedAt };
});

app.post('/api/data-request', { preHandler: requireEmployee }, async (req: any, reply) => {
  const p = z.object({ type: z.enum(['access', 'rectify', 'erase']), note: z.string().optional() }).safeParse(req.body);
  if (!p.success) return bad(reply, 'Geçersiz talep');
  await prisma.dataRequest.create({ data: { employeeId: req.user.sub, type: p.data.type, note: p.data.note } });
  return { ok: true };
});

/* ───────── BİLDİRİMLER (çalışan, gerçek veriden türetilir) ───────── */
app.get('/api/notifications', { preHandler: requireEmployee }, async (req: any) => {
  const out: any[] = [];
  const reqs = await prisma.request.findMany({ where: { employeeId: req.user.sub, status: { in: ['approved', 'rejected'] } }, orderBy: { createdAt: 'desc' }, take: 5 });
  for (const r of reqs) out.push({
    icon: r.status === 'approved' ? 'check' : 'x', tone: r.status === 'approved' ? 'ok' : 'err',
    title: r.status === 'approved' ? 'Talebiniz onaylandı' : 'Talebiniz reddedildi',
    body: `${r.type}${r.detail ? ' · ' + r.detail : ''}`, time: r.createdAt,
  });
  const { start, end } = monthRange(currentMonth());
  const punches = await prisma.punch.findMany({ where: { employeeId: req.user.sub, serverTime: { gte: start, lt: end } }, orderBy: { serverTime: 'asc' } });
  for (const d of dailyRecords(punches, { todayKey: workDayKey(new Date()) }).filter(x => x.status === 'missing' && !x.inProgress).slice(-3)) out.push({
    icon: 'bell', tone: 'warn', title: 'Çıkış okutmayı unuttunuz', body: `${d.date} · giriş ${d.in}, çıkış kaydı yok`, time: new Date(d.date),
  });
  out.sort((a, b) => +new Date(b.time) - +new Date(a.time));
  return out;
});

/* ───────── ADMIN BİLDİRİMLERİ (türetilmiş + okundu takipli) ───────── */
const notifSeenKey = (adminId: number) => `notif-seen:${adminId}`;
async function getLastSeen(adminId: number): Promise<Date> {
  const row = await prisma.setting.findUnique({ where: { key: notifSeenKey(adminId) } });
  if (!row) return new Date(0);
  try { return new Date(JSON.parse(row.value).at); } catch { return new Date(0); }
}
const DSAR_TR: Record<string, string> = { access: 'erişim', rectify: 'düzeltme', erase: 'silme' };

app.get('/api/admin/notifications', { preHandler: requireAdmin }, async (req: any) => {
  const items: any[] = [];

  // 1) Onay bekleyen çalışanlar
  for (const e of await prisma.employee.findMany({ where: { status: 'pending' }, orderBy: { createdAt: 'desc' } }))
    items.push({ id: `emp-${e.id}`, kind: 'approval', tone: 'warn', icon: 'user', title: 'Çalışan kayıt onayı bekliyor', body: e.name, time: e.createdAt, route: 'employees' });

  // 2) Talepler — yalnızca admin kademesine geçenler (izin müdür görüşüyle iletildi / SLA ile eskale)
  for (const r of await prisma.request.findMany({ where: { status: 'pending' }, include: { employee: true }, orderBy: { createdAt: 'desc' } })) {
    if (effectiveStage(r) !== 'admin') continue;
    const esc = r.stage === 'manager';
    items.push({ id: `req-${r.id}`, kind: 'request', tone: 'brand', icon: 'inbox', title: esc ? 'Talep eskale oldu (müdür yanıt vermedi)' : (r.managerRec === 'reject' ? 'İzin talebi · müdür uygun bulmadı' : 'İzin talebi · müdür görüşü hazır'), body: `${r.employee.name} · ${r.type}`, time: r.managerDecidedAt || r.createdAt, route: 'approvals' });
  }

  // 3) Bekleyen KVKK/DSAR talepleri
  for (const dr of await prisma.dataRequest.findMany({ where: { status: 'pending' }, include: { employee: true }, orderBy: { createdAt: 'desc' } }))
    items.push({ id: `dsar-${dr.id}`, kind: 'dsar', tone: 'brand', icon: 'shield', title: 'KVKK ilgili kişi talebi', body: `${dr.employee.name} · ${DSAR_TR[dr.type] || dr.type}`, time: dr.createdAt, route: 'kvkk' });

  // 4) Bayraklı/itirazlı puantaj (bu ay, çalışan+gün bazında)
  const { start, end } = monthRange(currentMonth());
  const reviewPunches = await prisma.punch.findMany({ where: { status: 'review', serverTime: { gte: start, lt: end } }, include: { employee: true }, orderBy: { serverTime: 'desc' } });
  const seenFlag = new Set<string>();
  for (const p of reviewPunches) {
    const day = new Date(p.serverTime); day.setHours(0, 0, 0, 0);
    const k = `${p.employeeId}-${day.toISOString().slice(0, 10)}`;
    if (seenFlag.has(k)) continue; seenFlag.add(k);
    items.push({ id: `flag-${k}`, kind: 'flag', tone: 'err', icon: 'alert', title: 'Bayraklı puantaj kaydı', body: `${p.employee.name} · ${day.toISOString().slice(0, 10)} — okutma şüpheli/itirazlı bulunup incelemeye alındı; kontrol edip onaylayın.`, time: p.serverTime, route: 'timesheet' });
  }

  // 5) Son cihaz iptal olayları
  for (const a of await prisma.auditLog.findMany({ where: { kind: 'cihaz', action: { contains: 'iptal' } }, orderBy: { createdAt: 'desc' }, take: 10 }))
    items.push({ id: `dev-${a.id}`, kind: 'device', tone: 'neu', icon: 'shield', title: a.action, body: a.detail || '', time: a.createdAt, route: 'branches' });

  items.sort((x, y) => +new Date(y.time) - +new Date(x.time));
  const top = items.slice(0, 30);
  const lastSeen = await getLastSeen(req.user.sub);
  const unreadCount = top.filter(i => new Date(i.time) > lastSeen).length;
  return { items: top, unreadCount, lastSeen: lastSeen.toISOString() };
});

app.post('/api/admin/notifications/seen', { preHandler: requireAdmin }, async (req: any) => {
  const at = new Date().toISOString();
  await prisma.setting.upsert({ where: { key: notifSeenKey(req.user.sub) }, create: { key: notifSeenKey(req.user.sub), value: JSON.stringify({ at }) }, update: { value: JSON.stringify({ at }) } });
  return { ok: true, at };
});

// SQLite WAL modu: eşzamanlı okuma/yazma + güvenli sıcak yedek (cp/.backup tutarlı kalır)
// PRAGMA bir satır döndürdüğü için queryRaw kullanılır (executeRaw SQLite'ta sonuç döndüremez)
prisma.$queryRawUnsafe('PRAGMA journal_mode=WAL;')
  .then((r: any) => app.log.info(`SQLite journal_mode=${r?.[0]?.journal_mode ?? '?'}`))
  .catch((e) => app.log.warn(`WAL ayarlanamadı: ${e?.message ?? e}`));

app.listen({ port: PORT, host: '0.0.0.0' })
  .then(() => app.log.info(`API http://localhost:${PORT} (LAN: http://192.168.1.106:${PORT})`))
  .catch((e) => { app.log.error(e); process.exit(1); });
