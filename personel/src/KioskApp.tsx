// KioskApp.tsx — kiosk modu: şube login → kiosk + teyit + yönetici + B3 offline (canlı)
import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import * as Network from 'expo-network';
import { color as C } from './theme/tokens';
import { nowHM } from './data';
import { BranchLogin } from './screens/tablet/BranchLogin';
import { KioskScreen } from './screens/tablet/Kiosk';
import { PinPad, ExitPad, ManagerReview, ManualPunch } from './screens/tablet/Manager';

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
    </View>
  );
}
