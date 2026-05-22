import { Text, View } from 'react-native';
import { EyeOff, Lock, ShieldCheck } from 'lucide-react-native';

import { ScoreLogItem } from '../../components/game/ScoreLogItem';
import { Screen } from '../../components/layout/Screen';
import { InfoBanner } from '../../components/ui/InfoBanner';
import { scoreEvents } from '../../data/mockState';
import { useAppStyles } from '../../theme/useAppStyles';

export function PlayerReportScreen() {
  const { styles, theme } = useAppStyles();
  const revealed = false;

  if (!revealed) {
    return (
      <Screen eyebrow="REVEAL LOCKED" title="Scores stay sealed">
        <InfoBanner
          icon={Lock}
          title="Host reveal pending"
          subtitle="Live team totals are hidden until the host opens the reveal."
          color={theme.palette.accent}
        />
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.metaLabelAccent}>WHY HIDDEN</Text>
            <EyeOff color={theme.palette.info} size={18} />
          </View>
          <Text style={styles.cardTitle}>No live leaderboard</Text>
          <Text style={styles.bodyText}>
            Teams keep playing without point-chasing. After reveal, this screen becomes the audit report with
            score history, bonuses, penalties, and corrections.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen eyebrow={`${theme.displayName.toUpperCase()} REPORT`} title="Score history">
      <InfoBanner
        icon={ShieldCheck}
        title="Reveal complete"
        subtitle="Review point changes and flag anything that looks wrong."
        color={theme.palette.success}
      />
      <Text style={styles.sectionTitle}>Score log</Text>
      {scoreEvents.map((event) => (
        <ScoreLogItem key={event.id} label={`${event.teamName}: ${event.label}`} delta={event.delta} />
      ))}
    </Screen>
  );
}
