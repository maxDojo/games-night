import { Text, View } from 'react-native';

import { useAppStyles } from '../../theme/useAppStyles';

interface SmallButtonProps {
  label: string;
  primary?: boolean;
  danger?: boolean;
}

export function SmallButton({ label, primary, danger }: SmallButtonProps) {
  const { styles, theme } = useAppStyles();

  return (
    <View
      style={[
        styles.smallButton,
        primary && { backgroundColor: theme.palette.accent },
        danger && { backgroundColor: theme.palette.danger },
      ]}
    >
      <Text style={[styles.smallButtonText, primary && { color: theme.palette.ink }]}>{label}</Text>
    </View>
  );
}
