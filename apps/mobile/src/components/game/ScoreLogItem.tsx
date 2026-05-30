import { Text } from 'react-native';

import { MotionView } from '../motion';
import { useAppStyles } from '../../theme/useAppStyles';

interface ScoreLogItemProps {
  label: string;
  delta: number;
}

export function ScoreLogItem({ label, delta }: ScoreLogItemProps) {
  const { styles, theme } = useAppStyles();
  const positive = delta > 0;

  return (
    <MotionView style={styles.scoreLogItem}>
      <Text style={styles.scoreLogLabel}>{label}</Text>
      <Text style={[styles.scoreLogDelta, { color: positive ? theme.palette.success : theme.palette.danger }]}>
        {positive ? '+' : ''}
        {delta}
      </Text>
    </MotionView>
  );
}
