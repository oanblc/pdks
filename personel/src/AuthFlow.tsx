// AuthFlow.tsx — çalışan kimlik doğrulama akışı: giriş / kayıt / şifremi unuttum
import React, { useState } from 'react';
import { Login } from './screens/auth/Login';
import { Register, RegisterPending } from './screens/auth/Register';
import { Forgot } from './screens/auth/Forgot';
import type { Emp } from './api';

type Screen = 'login' | 'register' | 'pending' | 'forgot';

export function AuthFlow({ onAuthed, onBack }: { onAuthed: (emp: Emp) => void; onBack: () => void }) {
  const [screen, setScreen] = useState<Screen>('login');

  if (screen === 'login') {
    return (
      <Login
        onAuthed={onAuthed}
        onRegister={() => setScreen('register')}
        onForgot={() => setScreen('forgot')}
        onBack={onBack}
      />
    );
  }
  if (screen === 'register') {
    return <Register onSubmitted={() => setScreen('pending')} onBack={() => setScreen('login')} />;
  }
  if (screen === 'pending') {
    return <RegisterPending onDone={() => setScreen('login')} />;
  }
  return <Forgot onBack={() => setScreen('login')} />;
}
