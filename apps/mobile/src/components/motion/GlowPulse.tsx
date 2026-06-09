import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useReducedMotion } from './useReducedMotion';

interface GlowPulseProps {
  active?: boolean;
  borderRadius?: number;
  children: ReactNode;
  color: string;
  style?: StyleProp<ViewStyle>;
}

export function GlowPulse({ active = true, borderRadius = 18, children, color, style }: GlowPulseProps) {
  const progress = useRef(new Animated.Value(active ? 1 : 0)).current;
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    progress.stopAnimation();

    if (!active) {
      progress.setValue(0);
      return;
    }

    if (reducedMotion) {
      progress.setValue(0.38);
      return;
    }

    progress.setValue(0);
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();

    return () => animation.stop();
  }, [active, progress, reducedMotion]);

  const opacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.01, 0.1],
  });

  return (
    <View style={[styles.wrap, style]}>
      {children}
      <Animated.View
        pointerEvents="none"
        style={[styles.wash, { backgroundColor: color, borderRadius, opacity }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
  },
  wash: {
    ...StyleSheet.absoluteFillObject,
  },
});
