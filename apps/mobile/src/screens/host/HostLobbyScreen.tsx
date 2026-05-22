import { Text, View } from 'react-native';
import { Award, ClipboardList, Gift, Play } from 'lucide-react-native';

import { Screen } from '../../components/layout/Screen';
import { ActionButton } from '../../components/ui/ActionButton';
import { Pill } from '../../components/ui/Badges';
import { Stat } from '../../components/ui/Stat';
import { bonusAwards, joinCode } from '../../data/mockState';
import { useAppStyles } from '../../theme/useAppStyles';

export function HostLobbyScreen() {
  const { styles, theme } = useAppStyles();

  return (
    <Screen eyebrow="THEMED ROOM" title={theme.displayName}>
      <View style={styles.roomCard}>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.metaLabelLight}>ROOM CODE</Text>
            <Text style={styles.bigCode}>{joinCode}</Text>
          </View>
          <Pill label="LIVE" />
        </View>
        <View style={styles.statRow}>
          <Stat value="3" label="teams" />
          <Stat value="19" label="players" />
          <Stat value="6" label="rounds" />
        </View>
      </View>
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.metaLabelAccent}>NEXT ROUND</Text>
          <Text style={styles.positiveText}>650 pts</Text>
        </View>
        <Text style={styles.cardTitle}>Custom: Word Scramble</Text>
        <Text style={styles.bodyText}>
          Manual score round. Corrections require a reason and stay visible in the score log.
        </Text>
      </View>
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.metaLabelAccent}>SPECIAL BONUSES</Text>
          <Gift color={theme.palette.info} size={18} />
        </View>
        <Text style={styles.bodyText}>
          Award room-energy points without exposing the live leaderboard to players.
        </Text>
        <View style={styles.stack}>
          {bonusAwards.map((bonus) => (
            <View key={bonus.id} style={styles.scoreLogItem}>
              <View style={styles.flex}>
                <Text style={styles.scoreLogLabel}>{bonus.label}</Text>
                <Text style={styles.teamMeta}>{bonus.reason}</Text>
              </View>
              <Text style={[styles.scoreLogDelta, { color: theme.palette.success }]}>+{bonus.points}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={styles.twoColumn}>
        <ActionButton label="Start" icon={Play} onPress={() => undefined} primary />
        <ActionButton label="Bonus" icon={Award} onPress={() => undefined} success />
      </View>
      <View style={styles.twoColumn}>
        <ActionButton label="Score log" icon={ClipboardList} onPress={() => undefined} />
        <ActionButton label="Reveal" icon={Gift} onPress={() => undefined} />
      </View>
    </Screen>
  );
}
