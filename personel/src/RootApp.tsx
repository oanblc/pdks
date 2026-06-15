// RootApp.tsx — açılış tanıtımı → mod seçimi → çalışan / kiosk.
import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { ModeSelect, AppMode } from './screens/ModeSelect';
import { OnboardingFlow } from './screens/Onboarding';
import { EmployeeApp } from './EmployeeApp';
import { AuthFlow } from './AuthFlow';
import { KioskApp } from './KioskApp';
import { setToken, setOnUnauthorized, type Emp } from './api';
import { saveToken, clearReminderCtx } from './lib/session';

export function RootApp() {
  const [intro, setIntro] = useState(true);   // ilk açılış: tanıtım + izinler
  const [mode, setMode] = useState<AppMode | null>(null);
  const [emp, setEmp] = useState<Emp | null>(null);

  // Oturum düşerse (401) çalışanı girişe döndür
  useEffect(() => { setOnUnauthorized(() => { setEmp(null); }); return () => setOnUnauthorized(null); }, []);

  return (
    <View style={{ flex: 1 }}>
      {intro ? (
        <OnboardingFlow onComplete={() => setIntro(false)} />
      ) : mode === null ? (
        <ModeSelect onSelect={setMode} />
      ) : mode === 'employee' ? (
        emp
          ? <EmployeeApp employee={emp} live onSignOut={() => { setToken(null); saveToken(null); clearReminderCtx(); setEmp(null); }} />
          : <AuthFlow onAuthed={(e) => setEmp(e)} onBack={() => setMode(null)} />
      ) : (
        <KioskApp onExit={() => setMode(null)} />
      )}
    </View>
  );
}
