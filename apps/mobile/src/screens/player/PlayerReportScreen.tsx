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
  const {
    checkedInTeam,
    isLoadingScoreReport,
    joinCode,
    partyStatus,
    playerNickname,
    refreshScoreReport,
    scoreEvents,
    scoresRevealed,
    teams,
  } = usePartyState();
  const rankedTeams = [...teams].sort((a, b) => b.points - a.points);
  const winner = rankedTeams[0];

  useEffect(() => {
    void refreshScoreReport();
  }, [refreshScoreReport]);

  if (!scoresRevealed) {
    return (
      <Screen
        avatarLabel={playerNickname || checkedInTeam?.name}
        immersive
        roomCode={joinCode}
        roomStatus={partyStatus ?? 'LOBBY'}
      >
        <View style={styles.screenTitleBlock}>
          <Text style={styles.eyebrow}>REVEAL LOCKED</Text>
          <Text style={styles.screenTitle}>Scores Stay Sealed</Text>
          <Text style={styles.screenSubtitle}>The final report unlocks when the host opens the reveal.</Text>
        </View>
        <View style={[styles.luminousHeroPanel, styles.cardAccent]}>
          <View style={styles.luminousHeroOrb}>
            <EyeOff color={theme.palette.accent} size={28} />
          </View>
          <Text style={styles.luminousHeroMeta}>Reveal locked</Text>
          <Text style={styles.luminousHeroTitle}>Scores stay sealed</Text>
          <Text style={styles.centeredBodyText}>
            The report unlocks when the host opens the final reveal.
          </Text>
        </View>
        <InfoBanner
          icon={Lock}
          live={isLoadingScoreReport}
          title="Host reveal pending"
          subtitle={isLoadingScoreReport ? 'Checking reveal status.' : 'Live team totals are hidden until the host opens the reveal.'}
          color={theme.palette.accent}
        />
        <View style={[styles.card, styles.cardLuminous]}>
          <View style={styles.glowStrip} />
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
    <Screen
      avatarLabel={playerNickname || checkedInTeam?.name}
      immersive
      roomCode={joinCode}
      roomStatus="REVEALED"
    >
      <View style={styles.screenTitleBlock}>
        <Text style={styles.eyebrow}>FINAL REPORT</Text>
        <Text style={styles.screenTitle}>Final Standings</Text>
        <Text style={styles.screenSubtitle}>The scores are open. Review every award, penalty, and correction.</Text>
      </View>
      <View style={[styles.luminousHeroPanel, styles.cardAction]}>
        <View style={styles.luminousHeroOrb}>
          <Text style={styles.luminousHeroOrbText}>{winner?.shortName ?? '1'}</Text>
        </View>
        <Text style={styles.luminousHeroMeta}>Final standings</Text>
        <Text style={styles.luminousHeroTitle}>{winner ? `${winner.name} wins` : 'Reveal complete'}</Text>
        <Text style={styles.centeredBodyText}>
          {winner
            ? `${winner.points.toLocaleString()} points. Review the full score history below.`
            : 'Review point changes and flag anything that looks wrong.'}
        </Text>
      </View>
      <InfoBanner
        icon={ShieldCheck}
        title="Reveal complete"
        subtitle="Review point changes and flag anything that looks wrong."
        color={theme.palette.success}
      />
      <View style={styles.glowStrip} />
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
