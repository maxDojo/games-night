import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface GradientPanelProps {
  children: ReactNode;
  colors: [string, string, ...string[]];
  style?: StyleProp<ViewStyle>;
}

export function GradientPanel({ children, colors, style }: GradientPanelProps) {
  return (
    <LinearGradient
      colors={colors}
      end={{ x: 1, y: 1 }}
      start={{ x: 0, y: 0 }}
      style={style}
    >
      {children}
    </LinearGradient>
  );
}
