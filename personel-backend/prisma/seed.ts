// seed.ts — gerçekçi başlangıç verisi (tek şube, geçmiş punch'larla)
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const KVKK_VERSION = 'v2.1';

const day = (daysAgo: number, h: number, m: number) => {
  const d = new Date(); d.setDate(d.getDate() - daysAgo); d.setHours(h, m, 0, 0); return d;
};

async function main() {
  await prisma.punch.deleteMany();
  await prisma.request.deleteMany();
  await prisma.dataRequest.deleteMany();
  await prisma.consentRecord.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.payrollPeriod.deleteMany();
  await prisma.device.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.adminUser.deleteMany();

  const merkez = await prisma.branch.create({ data: {
    name: 'Merkez Şube', city: 'İstanbul', username: 'merkez-sube', passwordHash: await bcrypt.hash('sube123', 10),
  } });
  await prisma.device.create({ data: { branchId: merkez.id, code: 'TBL-0294', status: 'active' } });

  const gunduz = await prisma.shift.create({ data: { name: 'Gündüz', start: '09:00', end: '18:00', breakMin: 60 } });
  const aksam = await prisma.shift.create({ data: { name: 'Akşam', start: '13:00', end: '22:00', breakMin: 60 } });

  await prisma.adminUser.create({ data: {
    email: 'admin@firma.com', name: 'Ayşe Erdem', role: 'su', passwordHash: await bcrypt.hash('admin123', 10),
  } });

  const pw = await bcrypt.hash('1234', 10);
  const ayse = await prisma.employee.create({ data: { tc: '11111111111', name: 'Ayşe Yıldırım', phone: '05325550001', dept: 'Satış', role: 'Kasiyer', sicil: '10428', status: 'active', branchId: merkez.id, shiftId: gunduz.id, startDate: new Date('2023-03-12'), passwordHash: pw } });
  const mehmet = await prisma.employee.create({ data: { tc: '22222222222', name: 'Mehmet Demir', phone: '05325550002', dept: 'Depo', role: 'Depo sorumlusu', sicil: '10429', status: 'active', branchId: merkez.id, shiftId: gunduz.id, startDate: new Date('2022-09-01'), passwordHash: pw } });
  const elif = await prisma.employee.create({ data: { tc: '55555555555', name: 'Elif Yılmaz', phone: '05325550005', dept: 'Satış', role: 'Satış danışmanı', sicil: '10471', status: 'active', branchId: merkez.id, shiftId: aksam.id, startDate: new Date('2024-01-15'), passwordHash: pw } });
  await prisma.employee.create({ data: { tc: '33333333333', name: 'Burak Aydın', phone: '05325550003', address: 'Kadıköy / İstanbul', status: 'pending', branchId: merkez.id, passwordHash: pw } });

  // rıza kayıtları
  for (const e of [ayse, mehmet, elif]) await prisma.consentRecord.create({ data: { employeeId: e.id, version: KVKK_VERSION } });

  // geçmiş punch'lar — son 12 iş günü
  const offsets: number[] = [];
  for (let i = 1; offsets.length < 12 && i <= 25; i++) { const d = new Date(); d.setDate(d.getDate() - i); const dow = d.getDay(); if (dow !== 0 && dow !== 6) offsets.push(i); }

  const P: { i: [number, number]; o: [number, number] | null; review?: boolean }[] = [
    { i: [8, 55], o: [18, 5] },
    { i: [9, 22], o: [18, 10], review: true }, // geç → bir tanesi itirazlı
    { i: [8, 50], o: [20, 10] },               // fazla mesai
    { i: [8, 58], o: null },                    // eksik çıkış
    { i: [9, 0], o: [17, 48] },                 // erken
    { i: [8, 52], o: [18, 2] },
  ];

  const punch = (empId: number, action: string, when: Date, status = 'ok') =>
    prisma.punch.create({ data: { employeeId: empId, branchId: merkez.id, action, serverTime: when, status } });

  const actives = [ayse, mehmet, elif];
  for (let ei = 0; ei < actives.length; ei++) {
    const emp = actives[ei];
    for (let k = 0; k < offsets.length; k++) {
      const off = offsets[k];
      const p = P[(k + ei) % P.length];
      await punch(emp.id, 'enter', day(off, p.i[0], p.i[1]), p.review && k === 1 ? 'review' : 'ok');
      await punch(emp.id, 'break-out', day(off, 12, 30));
      await punch(emp.id, 'break-in', day(off, 13, 15));
      if (p.o) await punch(emp.id, 'exit', day(off, p.o[0], p.o[1]));
    }
  }

  // talepler — kiosk-önce akışı: müdür kademesinde başlar (branchId set)
  await prisma.request.create({ data: { employeeId: ayse.id, kind: 'leave', type: 'Yıllık izin', detail: '18–20 Haziran · 3 gün', status: 'pending', branchId: merkez.id, stage: 'manager' } });
  await prisma.request.create({ data: { employeeId: mehmet.id, kind: 'fix', type: 'Eksik okutma düzeltme', detail: '3 Haziran · çıkış 18:05', status: 'pending', branchId: merkez.id, stage: 'manager' } });
  // müdür görüşü verilmiş, admin onayı bekleyen bir izin
  await prisma.request.create({ data: { employeeId: elif.id, kind: 'leave', type: 'Hastalık izni', detail: '12–13 Mayıs · 2 gün', status: 'pending', branchId: merkez.id, stage: 'admin', managerRec: 'approve', managerNote: 'Rapor ibraz etti', managerDecidedAt: new Date() } });

  // veri talepleri (KVKK DSAR)
  await prisma.dataRequest.create({ data: { employeeId: ayse.id, type: 'access', note: 'Tüm verilerimin kopyası', status: 'pending' } });

  // bordro dönemi (açık)
  const now = new Date();
  await prisma.payrollPeriod.create({ data: { month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`, status: 'open' } });

  console.log('Seed tamam: 1 şube (merkez-sube/sube123), 2 vardiya, admin (admin@firma.com/admin123), 4 çalışan, 12 iş günü punch geçmişi, rıza/talep/DSAR/bordro.');
}

main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
