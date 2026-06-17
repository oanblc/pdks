// EmployeeApp.tsx — çalışan modu: durum makinesi + navigasyon + overlay yönetimi
import React, { useEffect, useState } from 'react';
import { View, AppState } from 'react-native';
import * as Location from 'expo-location';
import { color as C } from './theme/tokens';
import { EMPLOYEE, Status, Action, nowHM } from './data';
import { api, type Emp } from './api';
import { HomeScreen, HomeApi } from './screens/HomeScreen';
import { RequestsScreen } from './screens/RequestsScreen';
import { ScanScreen, ResultScreen, ResultKind } from './screens/ScanResult';
import { OnboardingFlow } from './screens/Onboarding';
import { ProfileScreen, NotificationsScreen, PushBanner } from './screens/Profile';
import { TabBar } from './components/ui';
import { initNotifications } from './lib/notify';
import { syncReminders, clearAllReminders, dismissReminder, type ReminderKey } from './lib/reminders';
import { startBranchGeofence, stopBranchGeofence } from './lib/geofence';
import { enqueuePunch, flushQueue, newClientId } from './lib/punchQueue';
import type { ApiError } from './api';
import type { Geo } from './lib/session';

type Overlay =
  | { type: 'scan'; action: Action }
  | { type: 'result'; action: Action; kind: ResultKind; time: string; branch: string; message?: string };

// Okutma anında telefon konumu — sunucu 100 m geofence doğrulaması için.
async function getCoords(): Promise<{ lat: number; lng: number } | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch { return null; }
}

function hm(iso: string) { return new Date(iso).toTimeString().slice(0, 5); }

export function EmployeeApp({ onSignOut, initialStatus = 'outside', employee, live = false }:
  { onSignOut?: () => void; initialStatus?: Status; employee?: Emp; live?: boolean } = {}) {
  // Yetkili/kiosk kodu — me() ile güncellenir
  const [isManager, setIsManager] = useState(!!employee?.isManager);
  const [kioskCode, setKioskCode] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(employee?.avatar ?? null);
  // Gerçek çalışan varsa onu, yoksa (önizleme) mock'u kullan
  const display = {
    name: employee?.name ?? EMPLOYEE.name,
    role: employee?.role ?? EMPLOYEE.role,
    branch: employee?.branch ?? EMPLOYEE.branch,
    dept: employee?.dept ?? EMPLOYEE.dept,
    shift: employee?.shift ?? EMPLOYEE.shift,
    startDate: employee?.startDate ?? null,
    isManager: isManager,
    kioskCode: kioskCode,
    avatar: avatar,
    id: employee?.sicil ?? EMPLOYEE.id,
  };
  const branchId = employee?.branchId ?? 1;

  const [tab, setTab] = useState('home');
  const [status, setStatus] = useState<Status>(initialStatus);
  const [entryTime, setEntryTime] = useState<number | null>(
    initialStatus === 'inside' ? Date.now() - (2 * 3600 + 14 * 60) * 1000
      : initialStatus === 'break' ? Date.now() - 3 * 3600 * 1000 : null);
  const [breakStart, setBreakStart] = useState<number | null>(
    initialStatus === 'break' ? Date.now() - 12 * 60 * 1000 : null);
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [onb, setOnb] = useState<{ start: number } | null>(null);
  const [push, setPush] = useState<{ key: ReminderKey; title: string; body: string; tone: string; icon: any } | null>(null);
  // me() ile gelen taze hatırlatma bağlamı (vardiya mutlak zamanları dahil — login prop'u bayatlamaz)
  type MeExtra = { lateToleranceMin: number; branchGeo: Geo | null; shiftStartAt: string | null; shiftEndAt: string | null; breakMin: number | null };
  const [meExtra, setMeExtra] = useState<MeExtra>({ lateToleranceMin: 15, branchGeo: null, shiftStartAt: null, shiftEndAt: null, breakMin: employee?.breakMin ?? null });

  // Hatırlatmaları güncelle (mevcut konumu okuyarak); koşul doluysa banner göster.
  const runSync = async (statusNow: Status, breakStartMs: number | null, extra: MeExtra) => {
    if (!live) return;
    const coords = await getCoords().catch(() => null);
    const banner = await syncReminders({
      status: statusNow, breakStartMs,
      shiftStartAt: extra.shiftStartAt, shiftEndAt: extra.shiftEndAt, breakMin: extra.breakMin,
      lateToleranceMin: extra.lateToleranceMin, branchGeo: extra.branchGeo, coords,
    });
    if (banner) setPush(banner);
  };

  // Sunucudan bugünkü durumu çek + hatırlatma/geofence kur
  const refresh = async () => {
    if (!live) return;
    try {
      await flushQueue().catch(() => {}); // bekleyen çevrimdışı okutmaları önce gönder ki durum güncel gelsin
      const r = await api.me();
      const st = r.today.status;
      const bs = r.today.breakStart ? Date.parse(r.today.breakStart) : null;
      setStatus(st);
      setEntryTime(r.today.entryTime ? Date.parse(r.today.entryTime) : null);
      setBreakStart(bs);
      const extra: MeExtra = { lateToleranceMin: r.lateToleranceMin ?? 15, branchGeo: r.branchGeo, shiftStartAt: r.shiftStartAt, shiftEndAt: r.shiftEndAt, breakMin: r.employee.breakMin ?? null };
      setMeExtra(extra);
      setIsManager(!!r.employee.isManager);
      setKioskCode(r.kioskCode);
      setAvatar(r.employee.avatar ?? null);
      await startBranchGeofence(r.branchGeo);
      await runSync(st, bs, extra);
    } catch { /* sessiz */ }
  };

  // Canlı: açılışta bildirim altyapısı + ilk senkron
  useEffect(() => { if (!live) return; initNotifications(); refresh(); }, [live]);

  // Uygulama ön plana dönünce durumu/hatırlatmaları tazele
  useEffect(() => {
    if (!live) return;
    const sub = AppState.addEventListener('change', s => { if (s === 'active') refresh(); });
    return () => sub.remove();
  }, [live]);

  const api2: HomeApi = {
    employee: display,
    shift: display.shift,
    status, entryTime, breakStart,
    punch: (action) => setOverlay({ type: 'scan', action }),
    openProfile: () => setShowProfile(true),
    openNotif: () => setShowNotif(true),
  };

  const applyAction = (a: Action) => {
    let st: Status = status, bs = breakStart;
    if (a === 'enter') { st = 'inside'; bs = null; setStatus('inside'); setEntryTime(Date.now()); setBreakStart(null); }
    else if (a === 'exit') { st = 'outside'; bs = null; setStatus('outside'); setEntryTime(null); setBreakStart(null); }
    else if (a === 'break-out') { st = 'break'; bs = Date.now(); setStatus('break'); setBreakStart(Date.now()); }
    else { st = 'inside'; bs = null; setStatus('inside'); setBreakStart(null); }
    if (live) runSync(st, bs, meExtra);
  };

  const onScanResult = async (scan?: { branchId?: number; deviceCode?: string }) => {
    if (overlay?.type !== 'scan') return;
    const a = overlay.action;
    if (live) {
      const bId = scan?.branchId ?? branchId;
      const coords = await getCoords();
      const clientId = newClientId();
      const clientTime = new Date().toISOString();
      try {
        const r = await api.punch(bId, a, coords || undefined, scan?.deviceCode, { clientId, clientTime });
        applyAction(a);
        setOverlay({ type: 'result', kind: 'success', action: a, time: hm(r.time), branch: display.branch });
        flushQueue().catch(() => {}); // varsa birikmiş kuyruğu da boşalt
      } catch (e) {
        const err = e as ApiError;
        if (err?.network) {
          // Bağlantı yok → okutmayı kuyruğa al, bağlantı gelince otomatik gönderilir
          await enqueuePunch({ clientId, branchId: bId, action: a, lat: coords?.lat, lng: coords?.lng, deviceCode: scan?.deviceCode, clientTime });
          applyAction(a);
          setOverlay({ type: 'result', kind: 'queued', action: a, time: hm(clientTime), branch: display.branch });
        } else {
          setOverlay({ type: 'result', kind: 'error', action: a, time: '', branch: display.branch, message: err?.message });
        }
      }
      return;
    }
    applyAction(a);
    setOverlay({ type: 'result', kind: 'success', action: a, time: nowHM(), branch: display.branch });
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      <View style={{ flex: 1 }}>
        {tab === 'home' && <HomeScreen app={api2} />}
        {tab === 'requests' && <RequestsScreen />}
      </View>
      <TabBar active={tab} onChange={setTab} />

      {overlay?.type === 'scan' && (
        <ScanScreen action={overlay.action} onResult={onScanResult} onClose={() => setOverlay(null)} />
      )}
      {overlay?.type === 'result' && (
        <ResultScreen
          kind={overlay.kind} action={overlay.action} time={overlay.time} branch={overlay.branch} message={overlay.message}
          onDone={() => setOverlay(null)}
          onRetry={() => setOverlay({ type: 'scan', action: overlay.action })} />
      )}
      {showProfile && (
        <ProfileScreen employee={display} onUpdated={refresh} onClose={() => setShowProfile(false)} onLogout={() => { setShowProfile(false); clearAllReminders(); stopBranchGeofence(); if (onSignOut) onSignOut(); else setOnb({ start: 0 }); }} />
      )}
      {showNotif && <NotificationsScreen onClose={() => setShowNotif(false)} />}
      {push && <PushBanner title={push.title} body={push.body} tone={push.tone} icon={push.icon} onPress={() => { setPush(null); setShowNotif(true); }} onDismiss={() => { dismissReminder(push.key); setPush(null); }} />}
      {onb && (
        <OnboardingFlow
          key={onb.start}
          start={onb.start}
          onComplete={() => { setOnb(null); setTab('home'); setStatus('outside'); setEntryTime(null); setBreakStart(null); }} />
      )}
    </View>
  );
}
