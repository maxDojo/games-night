import { Text, View } from 'react-native';
import { RadioTower, Timer } from 'lucide-react-native';

import { LivePulse } from '../../motion';
import { useAppStyles } from '../../../theme/useAppStyles';
import type { HostTurnStatus, QueuedRoundSummary } from '../../../types/product';

interface HostTriviaControlsProps {
  connected: boolean;
  round: QueuedRoundSummary;
  turn?: HostTurnStatus;
}

export function HostTriviaControls({ connected, round, turn }: HostTriviaControlsProps) {
  const { styles, theme } = useAppStyles();

  return (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <Text style={styles.metaLabelAccent}>TRIVIA STATUS</Text>
        {connected ? <LivePulse color={theme.palette.success} size={8} /> : <RadioTower color={theme.palette.muted} size={18} />}
      </View>
      <Text style={styles.cardTitle}>{round.label}</Text>
      <Text style={styles.bodyText}>
        Server timers control question pacing. Player phones answer when Trivia prompts are live.
      </Text>
      <View style={styles.timerCard}>
        <Timer color={theme.palette.accent} size={24} />
        <Text style={styles.timerText}>{turn ? `${turn.turnNumber}/${turn.total}` : 'LIVE'}</Text>
        <Text style={styles.timerSubtext}>{connected ? 'Socket connected' : 'Reconnecting host controls'}</Text>
      </View>
    </View>
  );
}
