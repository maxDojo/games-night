import { Text, View } from 'react-native';

import { useAppStyles } from '../../theme/useAppStyles';
import type { QueuedRoundSummary } from '../../types/product';

export function QueuedRoundCard({ round }: { round: QueuedRoundSummary }) {
  const { styles } = useAppStyles();
  const selected = round.status === 'ACTIVE' || round.order === 1;

  return (
    <View style={[styles.roundCard, selected && styles.roundSelected]}>
      <Text style={[styles.roundNumber, selected && styles.roundTextSelected]}>
        {round.order.toString().padStart(2, '0')}
      </Text>
      <View style={styles.flex}>
        <Text style={[styles.roundTitle, selected && styles.roundTextSelected]}>{round.label}</Text>
        <Text style={[styles.roundDetail, selected && styles.roundTextSelected]}>
          {round.points} pts / {round.detail}
        </Text>
      </View>
    </View>
  );
}
