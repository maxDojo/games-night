import { Text, View } from 'react-native';
import { Save } from 'lucide-react-native';

import { QueuedRoundCard } from '../../components/game/QueuedRoundCard';
import { Screen } from '../../components/layout/Screen';
import { InfoBanner } from '../../components/ui/InfoBanner';
import { SmallButton } from '../../components/ui/SmallButton';
import { usePartyState } from '../../state/PartyState';
import { useAppStyles } from '../../theme/useAppStyles';

export function HostQueueScreen() {
  const { styles, theme } = useAppStyles();
  const { queuedRounds } = usePartyState();

  return (
    <Screen eyebrow="QUEUE LAB / TV + PHONES" title="Build the run">
      <InfoBanner
        icon={Save}
        title={`Plan: ${theme.displayName} Friday`}
        subtitle="Saved queue / custom games enabled"
        color={theme.palette.danger}
      />
      <View style={styles.stack}>
        {queuedRounds.map((round) => (
          <QueuedRoundCard key={round.id} round={round} />
        ))}
      </View>
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>Point dial / selected round</Text>
          <Text style={styles.pointValue}>650</Text>
        </View>
        <View style={styles.threeColumn}>
          <SmallButton label="-50" danger />
          <SmallButton label="base" />
          <SmallButton label="+100" primary />
        </View>
      </View>
    </Screen>
  );
}
