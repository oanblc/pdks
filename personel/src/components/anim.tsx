// anim.tsx — giriş animasyonları + canlı göstergeler (RN Animated)
// İlke (DS'ten): dinlenme durumu her zaman görünür; donmuş karede içerik kaybolmaz.
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, ViewStyle, StyleProp } from 'react-native';
import { color as C } from '../theme/tokens';

const EASE = Easing.bezier(0.22, 0.61, 0.36, 1);

export function FadeUp({
  children, delay = 0, style, distance = 9,
}: { children: React.ReactNode; delay?: number; style?: StyleProp<ViewStyle>; distance?: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.timing(v, { toValue: 1, duration: 400, delay, easing: EASE, useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [v, delay]);
  return (
    <Animated.View
      style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

export function PopIn({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.timing(v, { toValue: 1, duration: 420, easing: EASE, useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [v]);
  const scale = v.interpolate({ inputRange: [0, 0.55, 1], outputRange: [0.84, 1.05, 1] });
  return <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>;
}

export function Spinner({ size = 22, trackColor = C.brand100, color = C.brand600, width = 2.5 }:
  { size?: number; trackColor?: string; color?: string; width?: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.timing(v, { toValue: 1, duration: 800, easing: Easing.linear, useNativeDriver: true }));
    a.start();
    return () => a.stop();
  }, [v]);
  const rotate = v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Animated.View style={{
      width: size, height: size, borderRadius: size / 2, borderWidth: width,
      borderColor: trackColor, borderTopColor: color, transform: [{ rotate }],
    }} />
  );
}

export function LiveDot({ size = 8, color = C.ok }: { size?: number; color?: string }) {
  const v = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 0.4, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(v, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    a.start();
    return () => a.stop();
  }, [v]);
  return <Animated.View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity: v }} />;
}

// QR tarama çizgisi (yukarı-aşağı süpürme)
export function ScanSweep({ height }: { height: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    a.start();
    return () => a.stop();
  }, [v]);
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [height * 0.06, height * 0.9] });
  return (
    <Animated.View style={{
      position: 'absolute', left: 8, right: 8, height: 2.5, borderRadius: 2,
      backgroundColor: C.brand300, transform: [{ translateY }],
    }} />
  );
}
