// App.tsx — giriş noktası. Fontları yükler, çalışan modunu açar.
// (Tablet kiosk modu aynı uygulamanın ayrı bir girişi olarak sonra eklenecek.)
import React from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  Geist_400Regular, Geist_500Medium, Geist_600SemiBold, Geist_700Bold,
} from '@expo-google-fonts/geist';
import { GeistMono_400Regular, GeistMono_500Medium } from '@expo-google-fonts/geist-mono';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootApp } from './src/RootApp';
import './src/lib/geofence'; // arka plan geofence görevini açılışta tanımlar

export default function App() {
  const [loaded] = useFonts({
    Geist_400Regular, Geist_500Medium, Geist_600SemiBold, Geist_700Bold,
    GeistMono_400Regular, GeistMono_500Medium,
  });

  if (!loaded) return <View style={{ flex: 1, backgroundColor: '#eef1f1' }} />;

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1 }}>
        <StatusBar style="dark" />
        <RootApp />
      </View>
    </SafeAreaProvider>
  );
}
