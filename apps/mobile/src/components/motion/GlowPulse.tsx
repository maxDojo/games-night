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
      progress.setValue(0.45);
      return;
    }

    progress.setValue(0);
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: 1300,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: 1300,
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
    outputRange: [0.12, 0.6],
  });
  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.035],
  });

  return (
    <View style={[styles.wrap, style]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.halo,
          {
            borderColor: color,
            borderRadius,
            opacity,
            shadowColor: color,
            transform: [{ scale }],
          },
        ]}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
  },
  halo: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 14,
    elevation: 7,
  },
});
