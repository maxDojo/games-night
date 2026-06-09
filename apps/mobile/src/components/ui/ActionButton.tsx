import { Text } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { AnimatedPressable } from '../motion';
import { useAppStyles } from '../../theme/useAppStyles';

interface ActionButtonProps {
  label: string;
  icon: LucideIcon;
  onPress: () => void;
  primary?: boolean;
  danger?: boolean;
  success?: boolean;
  disabled?: boolean;
}

export function ActionButton({ label, icon: Icon, onPress, primary, danger, success, disabled }: ActionButtonProps) {
  const { styles, theme } = useAppStyles();
  const backgroundColor = primary
    ? theme.palette.action
    : danger
      ? theme.palette.danger
      : success
        ? theme.palette.success
        : theme.palette.surface;
  const color = primary
    ? theme.palette.onAction
    : success
      ? theme.palette.onAccent
      : danger
        ? theme.palette.onDanger
        : theme.palette.foreground;

  const content = (
    <>
      <Icon color={color} size={17} />
      <Text style={[styles.actionButtonText, { color }]}>{label}</Text>
    </>
  );

  return (
    <AnimatedPressable
      disabled={disabled}
      style={[
        styles.actionButton,
        !primary && { backgroundColor },
        primary && styles.actionButtonPrimary,
        disabled && styles.disabledCard,
      ]}
      onPress={onPress}
    >
      {primary ? (
        <LinearGradient
          colors={[theme.palette.warning, theme.palette.action]}
          end={{ x: 1, y: 0 }}
          start={{ x: 0, y: 0 }}
          style={styles.actionButtonGradient}
        >
          {content}
        </LinearGradient>
      ) : (
        content
      )}
    </AnimatedPressable>
  );
}
