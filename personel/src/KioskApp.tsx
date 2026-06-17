// KioskApp.tsx — kiosk modu: şube login → kiosk + teyit + yönetici + B3 offline (canlı)
import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import * as Network from 'expo-network';
import { color as C } from './theme/tokens';
import { nowHM } from './data';
import { BranchLogin } from './screens/tablet/BranchLogin';
import { KioskScreen, ConfirmOverlay, Confirm } from './screens/tablet/Kiosk';
import { PinPad, ExitPad, ManagerReview, ManualPunch } from './screens/tablet/Manager';
import { api } from './api';

const BRANCH = 'Merkez Şube';

export function KioskApp({ onExit }: { onExit: () => void }) {
  const [screen, setScreen] = useState<'login' | 'kiosk'>('login');
  const [branch, setBranch] = useState(BRANCH);
  const [branchId, setBranchId] = useState<number | undefined>();
  const [deviceCode, setDeviceCode] = useState<string | undefined>();
  const [pin, setPin] = useState(false);
  const [review, setReview] = useState(false);
  const [manual, setManual] = useState(false);
  const [exitPrompt, setExitPrompt] = useState(false);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const lastPunchId = useRef<number | null>(null);
  const baselineSet = useRef(false);

  // ── B3 offline (canlı, gerçek ağ durumu) ──
  const [netOffline, setNetOffline] = useState(false);
  const [lastSync, setLastSync] = useState('—');
  const offline = netOffline;
  const prevOffline = useRef(offline);

  useEffect(() => {
    let sub: { remove?: () => void } | undefined;
    Network.getNetworkStateAsync().then(s => setNetOffline(s.isConnected === false)).catch(() => {});
    try { sub = Network.addNetworkStateListener(s => setNetOffline(s.isConnected === false)); } catch {}
    return () => sub?.remove?.();
  }, []);

  // çevrimdışına geçişte son senkron anını yakala
  useEffect(() => {
    const was = prevOffline.current;
    prevOffline.current = offline;
    if (!was && offline) setLastSync(nowHM());
  }, [offline]);

  // ── Son okutmayı yokla: yeni punch'ta çalışanın foto+adıyla "Hoş geldin" göster ──
  useEffect(() => {
    if (screen !== 'kiosk') return;
    baselineSet.current = false;
    let alive = true;
    const poll = async () => {
      try {
        const { punch } = await api.branchLastPunch();
        if (!alive || !punch) return;
        if (!baselineSet.current) { lastPunchId.current = punch.id; baselineSet.current = true; return; }
        if (punch.id !== lastPunchId.current) {
          lastPunchId.current = punch.id;
          if (Date.now() - new Date(punch.time).getTime() < 30000) {
            const action: 'enter' | 'exit' = (punch.action === 'enter' || punch.action === 'break-in') ? 'enter' : 'exit';
            setConfirm({ name: punch.name, avatar: punch.avatar, action, time: new Date(punch.time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) });
          }
        }
      } catch { /* sessiz */ }
    };
    poll();
    const id = setInterval(poll, 2500);
    return () => { alive = false; clearInterval(id); };
  }, [screen]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {screen === 'login'
        ? <BranchLogin onStart={(b, bid, dc) => { setBranch(b); setBranchId(bid); setDeviceCode(dc); setScreen('kiosk'); }} onBack={onExit} />
        : <KioskScreen
            branch={branch}
            branchId={branchId}
            deviceCode={deviceCode}
            offline={offline}
            lastSync={lastSync}
            onManager={() => setPin(true)}
            onExit={() => setExitPrompt(true)}
          />}

      {pin && <PinPad onOk={() => { setPin(false); setReview(true); }} onClose={() => setPin(false)} />}
      {review && (
        <ManagerReview
          branch={branch}
          onClose={() => { setReview(false); setManual(false); }}
          onManual={() => setManual(true)}
          onExitKiosk={() => { setReview(false); setManual(false); setExitPrompt(true); }}
        />
      )}
      {manual && <ManualPunch onClose={() => setManual(false)} />}
      {exitPrompt && <ExitPad onOk={() => { setExitPrompt(false); onExit(); }} onClose={() => setExitPrompt(false)} />}
      {confirm && screen === 'kiosk' && !review && !manual && !pin && !exitPrompt && <ConfirmOverlay data={confirm} onDone={() => setConfirm(null)} />}
    </View>
  );
}
