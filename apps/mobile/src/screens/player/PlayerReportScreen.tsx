import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { EyeOff, Lock, ShieldCheck } from 'lucide-react-native';

import { PodiumCard } from '../../components/game/PodiumCard';
import { ScoreLogItem } from '../../components/game/ScoreLogItem';
import { Screen } from '../../components/layout/Screen';
import { InfoBanner } from '../../components/ui/InfoBanner';
import { usePartyState } from '../../state/PartyState';
import { useAppStyles } from '../../theme/useAppStyles';

export function PlayerReportScreen() {
  const { styles, theme } = useAppStyles();
  const { isLoadingScoreReport, refreshScoreReport, scoreEvents, scoresRevealed, teams } = usePartyState();
  const rankedTeams = [...teams].sort((a, b) => b.points - a.points);

  useEffect(() => {
    void refreshScoreReport();
  }, [refreshScoreReport]);

  if (!scoresRevealed) {
    return (
      <Screen eyebrow="REVEAL LOCKED" title="Scores stay sealed">
        <InfoBanner
          icon={Lock}
          live={isLoadingScoreReport}
          title="Host reveal pending"
          subtitle={isLoadingScoreReport ? 'Checking reveal status.' : 'Live team totals are hidden until the host opens the reveal.'}
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
      <View style={styles.podium}>
        {rankedTeams.slice(0, 3).map((team, index) => (
          <PodiumCard
            key={team.id}
            rank={`${index + 1}`}
            name={team.name}
            points={team.points.toLocaleString()}
            color={team.color}
            winner={index === 0}
          />
        ))}
      </View>
      <Text style={styles.sectionTitle}>Score log</Text>
      {scoreEvents.map((event) => (
        <ScoreLogItem key={event.id} label={`${event.teamName}: ${event.label}`} delta={event.delta} />
      ))}
    </Screen>
  );
}
