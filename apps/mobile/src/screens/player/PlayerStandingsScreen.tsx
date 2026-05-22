import { Text, View } from 'react-native';

import { PodiumCard } from '../../components/game/PodiumCard';
import { ScoreLogItem } from '../../components/game/ScoreLogItem';
import { Screen } from '../../components/layout/Screen';
import { scoreEvents } from '../../data/mockState';
import { useAppStyles } from '../../theme/useAppStyles';

export function PlayerStandingsScreen() {
  const { styles, theme } = useAppStyles();

  return (
    <Screen eyebrow={`${theme.displayName.toUpperCase()} LEAGUE`} title="Scoreboard">
      <Text style={styles.bodyText}>
        Weekly standings, point swings, and corrections across the period.
      </Text>
      <View style={styles.podium}>
        <PodiumCard rank="2" name="Pirates" points="1,110" color={theme.palette.danger} />
        <PodiumCard rank="1" name="Noodles" points="1,340" color={theme.palette.accent} winner />
        <PodiumCard rank="3" name="Queens" points="980" color={theme.palette.info} />
      </View>
      <Text style={styles.sectionTitle}>Score log</Text>
      {scoreEvents.map((event) => (
        <ScoreLogItem key={event.id} label={event.label} delta={event.delta} />
      ))}
    </Screen>
  );
}
