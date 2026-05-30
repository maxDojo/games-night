import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, type StyleProp, type ViewStyle } from 'react-native';

import { useReducedMotion } from './useReducedMotion';

type MotionVariant = 'fade-up' | 'pop' | 'fade';

interface MotionViewProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
  variant?: MotionVariant;
}

export function MotionView({ children, delay = 0, duration = 260, style, variant = 'fade-up' }: MotionViewProps) {
  const progress = useRef(new Animated.Value(0)).current;
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      progress.setValue(1);
      return;
    }

    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      delay,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [delay, duration, progress, reducedMotion, variant]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: variant === 'fade-up' ? [14, 0] : [0, 0],
  });
  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: variant === 'pop' ? [0.92, 1] : [1, 1],
  });

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [{ translateY }, { scale }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
