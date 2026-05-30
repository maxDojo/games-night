import { useEffect, useRef, type ReactNode } from 'react';
import {
  Animated,
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useReducedMotion } from './useReducedMotion';

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

interface AnimatedPressableProps extends Omit<PressableProps, 'children' | 'style'> {
  children?: ReactNode;
  pressedScale?: number;
  style?: StyleProp<ViewStyle>;
}

export function AnimatedPressable({
  children,
  disabled,
  onPressIn,
  onPressOut,
  pressedScale = 0.97,
  style,
  ...props
}: AnimatedPressableProps) {
  const pressValue = useRef(new Animated.Value(1)).current;
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      pressValue.setValue(1);
    }
  }, [pressValue, reducedMotion]);

  const animateTo = (value: number) => {
    if (reducedMotion) {
      return;
    }

    Animated.spring(pressValue, {
      toValue: value,
      damping: 18,
      mass: 0.7,
      stiffness: 260,
      useNativeDriver: true,
    }).start();
  };

  const handlePressIn = (event: GestureResponderEvent) => {
    if (!disabled) {
      animateTo(pressedScale);
    }
    onPressIn?.(event);
  };

  const handlePressOut = (event: GestureResponderEvent) => {
    animateTo(1);
    onPressOut?.(event);
  };

  return (
    <AnimatedPressableBase
      {...props}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, { transform: [{ scale: pressValue }] }]}
    >
      {children}
    </AnimatedPressableBase>
  );
}
