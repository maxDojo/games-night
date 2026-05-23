import { Text, View } from 'react-native';
import { Award, ClipboardList, Gift, Play } from 'lucide-react-native';

import { Screen } from '../../components/layout/Screen';
import { ActionButton } from '../../components/ui/ActionButton';
import { Pill } from '../../components/ui/Badges';
import { Stat } from '../../components/ui/Stat';
import { usePartyState } from '../../state/PartyState';
import { useAppStyles } from '../../theme/useAppStyles';

export function HostLobbyScreen() {
  const { styles, theme } = useAppStyles();
  const {
    awardNextBonus,
    awardedBonusIds,
    bonusAwards,
    hostUser,
    joinCode,
    queuedRounds,
    revealScores,
    scoresRevealed,
    teams,
    totalPlayers,
  } = usePartyState();
  const nextRound = queuedRounds[queuedRounds.length - 1];
  const bonusLabel = awardedBonusIds.length >= bonusAwards.length ? 'Bonuses done' : 'Award bonus';

  return (
    <Screen eyebrow={hostUser ? `HOST: ${hostUser.displayName}` : 'THEMED ROOM'} title={theme.displayName}>
      <View style={styles.roomCard}>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.metaLabelLight}>ROOM CODE</Text>
            <Text style={styles.bigCode}>{joinCode}</Text>
          </View>
          <Pill label="LIVE" />
        </View>
        <View style={styles.statRow}>
          <Stat value={teams.length.toString()} label="teams" />
          <Stat value={totalPlayers.toString()} label="players" />
          <Stat value={scoresRevealed ? 'open' : 'sealed'} label="scores" accent={scoresRevealed} />
        </View>
      </View>
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.metaLabelAccent}>NEXT ROUND</Text>
          <Text style={styles.positiveText}>{nextRound.points} pts</Text>
        </View>
        <Text style={styles.cardTitle}>{nextRound.label}</Text>
        <Text style={styles.bodyText}>
          Manual score round. Corrections and special bonuses require a reason and stay visible in the final audit.
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
              <Text style={[styles.scoreLogDelta, { color: theme.palette.success }]}>
                {awardedBonusIds.includes(bonus.id) ? 'Awarded' : `+${bonus.points}`}
              </Text>
            </View>
          ))}
        </View>
      </View>
      <View style={styles.twoColumn}>
        <ActionButton label="Start" icon={Play} onPress={() => undefined} primary />
        <ActionButton
          label={bonusLabel}
          icon={Award}
          onPress={awardNextBonus}
          disabled={awardedBonusIds.length >= bonusAwards.length}
          success
        />
      </View>
      <View style={styles.twoColumn}>
        <ActionButton label="Score log" icon={ClipboardList} onPress={() => undefined} />
        <ActionButton
          label={scoresRevealed ? 'Revealed' : 'Reveal'}
          icon={Gift}
          onPress={revealScores}
          disabled={scoresRevealed}
        />
      </View>
    </Screen>
  );
}
