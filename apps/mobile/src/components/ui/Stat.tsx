import { Text, View } from 'react-native';

import { useAppStyles } from '../../theme/useAppStyles';

interface StatProps {
  value: string;
  label: string;
  danger?: boolean;
  accent?: boolean;
}

export function Stat({ value, label, danger, accent }: StatProps) {
  const { styles, theme } = useAppStyles();

  return (
    <View style={styles.stat}>
      <Text
        style={[
          styles.statValue,
          danger && { color: theme.palette.danger },
          accent && { color: theme.palette.accent },
        ]}
      >
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}
