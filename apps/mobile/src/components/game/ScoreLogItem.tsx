import { Text, View } from 'react-native';

import { useAppStyles } from '../../theme/useAppStyles';

interface ScoreLogItemProps {
  label: string;
  delta: number;
}

export function ScoreLogItem({ label, delta }: ScoreLogItemProps) {
  const { styles, theme } = useAppStyles();
  const positive = delta > 0;

  return (
    <View style={styles.scoreLogItem}>
      <Text style={styles.scoreLogLabel}>{label}</Text>
      <Text style={[styles.scoreLogDelta, { color: positive ? theme.palette.success : theme.palette.danger }]}>
        {positive ? '+' : ''}
        {delta}
      </Text>
    </View>
  );
}
