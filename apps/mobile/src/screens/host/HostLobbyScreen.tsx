import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Layers3, Settings } from 'lucide-react-native';

import { HostBonusAwardsCard } from '../../components/host/HostBonusAwardsCard';
import { HostNightActionsCard } from '../../components/host/HostNightActionsCard';
import { Screen } from '../../components/layout/Screen';
import { ScoreDeltaToast } from '../../components/motion';
import { ActionButton } from '../../components/ui/ActionButton';
import { Pill } from '../../components/ui/Badges';
import { Stat } from '../../components/ui/Stat';
import { usePartyState } from '../../state/PartyState';
import { useAppStyles } from '../../theme/useAppStyles';

export function HostLobbyScreen() {
  const { styles, theme } = useAppStyles();
  const {
    awardBonusToTeam,
    awardedBonusIds,
    bonusAwards,
    endNight,
    hostParty,
    hostPartyError,
    hostBonusError,
    hostTeams,
    hostUser,
    isAwardingBonus,
    isEndingNight,
    isRevealingScores,
    queuedRounds,
    refreshHostTeams,
    revealScores,
    scoresRevealed,
    selectHostTeam,
    selectedHostTeamId,
    totalPlayers,
  } = usePartyState();
  const [selectedBonusId, setSelectedBonusId] = useState<string | undefined>(bonusAwards[0]?.id);
  const nextRound = queuedRounds.find((round) => round.status === 'PENDING') ?? queuedRounds[0];
  const latestBonus = [...awardedBonusIds]
    .reverse()
    .map((bonusId) => bonusAwards.find((bonus) => bonus.id === bonusId))
    .find(Boolean);
  const roomCode = hostParty?.joinCode ?? '------';
  const roomName = hostParty?.name ?? theme.displayName;
  const roomStatus = hostParty?.status ?? 'DRAFT';
  const teamCapacity = hostParty ? `${hostParty.maxTeams} x ${hostParty.maxPerTeam}` : '0 x 0';
  const playerCount = hostParty ? 0 : totalPlayers;
  const isNightFinished = roomStatus === 'FINISHED';
  const hasActiveRound = queuedRounds.some((round) => round.status === 'ACTIVE');

  useEffect(() => {
    void refreshHostTeams();
  }, [refreshHostTeams]);

  useEffect(() => {
    if (!selectedBonusId || awardedBonusIds.includes(selectedBonusId)) {
      setSelectedBonusId(bonusAwards.find((bonus) => !awardedBonusIds.includes(bonus.id))?.id);
    }
  }, [awardedBonusIds, bonusAwards, selectedBonusId]);

  if (!hostParty) {
    return (
      <Screen avatarLabel={hostUser?.displayName} immersive>
        <View style={styles.screenTitleBlock}>
          <Text style={styles.eyebrow}>HOST DASHBOARD</Text>
          <Text style={styles.screenTitle}>Select a room first</Text>
          <Text style={styles.screenSubtitle}>
            Party setup and history now live in Rooms so switching nights cannot overwrite local state.
          </Text>
        </View>
        <View style={[styles.luminousHeroPanel, styles.cardAction]}>
          <Layers3 color={theme.palette.accent} size={30} />
          <Text style={styles.luminousHeroTitle}>Choose the night</Text>
          <Text style={styles.centeredBodyText}>
            Resume an active party or create a separate room before opening host controls.
          </Text>
        </View>
        {hostPartyError ? <Text style={styles.errorText}>{hostPartyError}</Text> : null}
        <ActionButton
          icon={Layers3}
          label="Open rooms"
          onPress={() => router.replace('/host/parties')}
          primary
        />
      </Screen>
    );
  }

  return (
    <Screen
      avatarLabel={hostUser?.displayName}
      immersive
      roomCode={roomCode}
      roomStatus={roomStatus}
    >
      <View style={styles.screenTitleBlock}>
        <Text style={styles.eyebrow}>{hostUser ? `HOST: ${hostUser.displayName}` : 'HOST DASHBOARD'}</Text>
        <Text style={styles.screenTitle}>{roomName}</Text>
        <Text style={styles.screenSubtitle}>
          Control the lobby, awards, and reveal from one place.
        </Text>
      </View>
      <View style={[styles.roomCard, styles.roomCardSpotlight]}>
        <View style={styles.glowStrip} />
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.metaLabelLight}>ROOM CODE</Text>
            <Text style={styles.bigCode}>{roomCode}</Text>
          </View>
          <Pill label={roomStatus} />
        </View>
        <View style={styles.statRow}>
          <Stat value={hostParty.maxTeams.toString()} label="teams" />
          <Stat value={playerCount.toString()} label="players" />
          <Stat value={teamCapacity} label="capacity" accent={Boolean(hostParty)} />
        </View>
      </View>
      {hostParty && hostPartyError ? <Text style={styles.errorText}>{hostPartyError}</Text> : null}
      <View style={styles.twoColumn}>
        <ActionButton label="Switch room" icon={Layers3} onPress={() => router.push('/host/parties')} />
        <ActionButton label="Party settings" icon={Settings} onPress={() => router.push('/host/settings')} />
      </View>
      <View style={[styles.card, styles.cardAccent]}>
        <View style={styles.rowBetween}>
          <Text style={styles.metaLabelAccent}>NEXT ROUND</Text>
          <Text style={styles.positiveText}>{nextRound ? `${nextRound.points} pts` : 'Queue empty'}</Text>
        </View>
        <Text style={styles.cardTitle}>{nextRound?.label ?? 'Build the queue'}</Text>
        <Text style={styles.bodyText}>
          Queue rounds from the host phone. Corrections and special bonuses require a reason and stay visible in the final audit.
        </Text>
      </View>
      <HostBonusAwardsCard
        awardedBonusIds={awardedBonusIds}
        bonuses={bonusAwards}
        disabled={!hostParty || isNightFinished}
        isAwarding={isAwardingBonus}
        onAward={(bonusId, teamId) => void awardBonusToTeam(bonusId, teamId)}
        onSelectBonus={setSelectedBonusId}
        onSelectTeam={selectHostTeam}
        selectedBonusId={selectedBonusId}
        selectedTeamId={selectedHostTeamId}
        teams={hostTeams}
      />
      {hostBonusError ? <Text style={styles.errorText}>{hostBonusError}</Text> : null}
      <ScoreDeltaToast
        label={latestBonus ? `${latestBonus.label} awarded` : 'Bonus awarded'}
        delta={latestBonus?.points ?? 0}
        visible={Boolean(latestBonus)}
      />
      <HostNightActionsCard
        canEndNight={Boolean(hostParty)}
        hasActiveRound={hasActiveRound}
        isEndingNight={isEndingNight}
        isNightFinished={isNightFinished}
        isRevealingScores={isRevealingScores}
        onEndNight={() => void endNight()}
        onRevealScores={() => void revealScores()}
        scoresRevealed={scoresRevealed}
      />
    </Screen>
  );
}
