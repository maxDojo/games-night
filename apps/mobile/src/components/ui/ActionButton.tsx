import { Text } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

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

  return (
    <AnimatedPressable
      disabled={disabled}
      style={[
        styles.actionButton,
        { backgroundColor },
        primary && styles.actionButtonPrimary,
        disabled && styles.disabledCard,
      ]}
      onPress={onPress}
    >
      <Icon color={color} size={18} />
      <Text style={[styles.actionButtonText, { color }]}>{label}</Text>
    </AnimatedPressable>
  );
}
