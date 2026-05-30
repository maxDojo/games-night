import { Text, View } from 'react-native';

import { useAppStyles } from '../../theme/useAppStyles';
import { MotionView } from './MotionView';

interface ScoreDeltaToastProps {
  label: string;
  delta: number;
  visible: boolean;
}

export function ScoreDeltaToast({ label, delta, visible }: ScoreDeltaToastProps) {
  const { styles, theme } = useAppStyles();

  if (!visible) {
    return null;
  }

  const positive = delta >= 0;

  return (
    <MotionView variant="pop" style={[styles.scoreToast, { borderColor: positive ? theme.palette.success : theme.palette.danger }]}>
      <View style={styles.scoreToastDot} />
      <Text style={styles.scoreToastLabel}>{label}</Text>
      <Text style={[styles.scoreToastDelta, { color: positive ? theme.palette.success : theme.palette.danger }]}>
        {positive ? '+' : ''}
        {delta}
      </Text>
    </MotionView>
  );
}
