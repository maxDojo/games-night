import { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Flag, Play } from 'lucide-react-native';

import { QueuedRoundCard } from '../../components/game/QueuedRoundCard';
import { HostGameControls } from '../../components/host/stage/HostGameControls';
import { HostManualScoreCard } from '../../components/host/stage/HostManualScoreCard';
import { HostRoundLifecycleControls } from '../../components/host/stage/HostRoundLifecycleControls';
import { Screen } from '../../components/layout/Screen';
import { InfoBanner } from '../../components/ui/InfoBanner';
import { Stat } from '../../components/ui/Stat';
import { usePartyState } from '../../state/PartyState';
import { useAppStyles } from '../../theme/useAppStyles';

export function HostStageScreen() {
  const { styles, theme } = useAppStyles();
  const {
    endHostRound,
    hostParty,
    hostGamePrompt,
    hostStageError,
    hostStageMessage,
    hostTeams,
    hostTurn,
    isControllingHostRound,
    isHostSocketConnected,
    isLoadingHostRounds,
    isSendingHostRoundEvent,
    isWritingHostScore,
    queuedRounds,
    refreshHostRoundSetup,
    refreshHostTeams,
    selectedHostTeamId,
    selectHostTeam,
    sendHostRoundEvent,
    skipHostRound,
    startHostRound,
    writeHostScore,
  } = usePartyState();
  const activeRound = queuedRounds.find((round) => round.status === 'ACTIVE');
  const nextRound = queuedRounds.find((round) => round.status === 'PENDING');
  const completedCount = queuedRounds.filter((round) => round.status === 'COMPLETED').length;
  const skippedCount = queuedRounds.filter((round) => round.status === 'SKIPPED').length;
  const selectedTeam = useMemo(
    () => hostTeams.find((team) => team.id === selectedHostTeamId) ?? hostTeams[0],
    [hostTeams, selectedHostTeamId],
  );
  const [points, setPoints] = useState('100');

  useEffect(() => {
    void refreshHostRoundSetup();
    void refreshHostTeams();
  }, [refreshHostRoundSetup, refreshHostTeams]);

  const controlsDisabled = !hostParty || isControllingHostRound || isLoadingHostRounds;
  const gameControlsDisabled = !activeRound || !isHostSocketConnected || isSendingHostRoundEvent;
  const promptRoundNeedsHostSocket = nextRound?.kind === 'charades' || nextRound?.kind === 'taboo';
  const waitingForHostSocket = promptRoundNeedsHostSocket && !isHostSocketConnected;

  return (
    <Screen eyebrow="ROUND CONTROL / HOST ONLY" title={activeRound?.label ?? nextRound?.label ?? 'Stage control'}>
      <InfoBanner
        icon={activeRound ? Play : Flag}
        title={activeRound ? 'Round is live' : hostParty ? 'Ready for next round' : 'Create a party first'}
        subtitle={
          activeRound
            ? 'End the active round or save manual scores while it is live.'
            : waitingForHostSocket
              ? 'Host-only prompts need the host socket before this round can start.'
            : nextRound
              ? 'Start or skip the next queued round from this phone.'
              : 'Queue rounds before using stage controls.'
        }
        color={activeRound ? theme.palette.success : theme.palette.info}
        live={Boolean(activeRound)}
      />

      <View style={[styles.spotlightPanel, activeRound && styles.spotlightPanelAccent]}>
        <View style={styles.glowStrip} />
        <View style={styles.statRow}>
          <Stat value={queuedRounds.length.toString()} label="queued" accent />
          <Stat value={completedCount.toString()} label="done" />
          <Stat value={skippedCount.toString()} label="skipped" danger />
        </View>
      </View>

      {activeRound ? <QueuedRoundCard round={activeRound} /> : null}
      {!activeRound && nextRound ? <QueuedRoundCard round={nextRound} /> : null}

      <HostRoundLifecycleControls
        activeRound={activeRound}
        controlsDisabled={controlsDisabled}
        isControlling={isControllingHostRound}
        isRefreshing={isLoadingHostRounds}
        nextRound={nextRound}
        onEnd={(roundId) => void endHostRound(roundId)}
        onRefresh={() => {
            void refreshHostRoundSetup();
            void refreshHostTeams();
        }}
        onSkip={(roundId) => void skipHostRound(roundId)}
        onStart={(roundId) => void startHostRound(roundId)}
        startDisabled={waitingForHostSocket}
      />

      <HostGameControls
        connected={isHostSocketConnected}
        disabled={gameControlsDisabled}
        onEvent={(type, teamId, payload) => activeRound && void sendHostRoundEvent(activeRound.id, type, teamId, payload)}
        prompt={hostGamePrompt}
        round={activeRound}
        selectedTeam={selectedTeam}
        teams={hostTeams}
        turn={hostTurn}
      />

      <HostManualScoreCard
        activeRoundId={activeRound?.id}
        disabled={!hostParty}
        isWriting={isWritingHostScore}
        onSelectTeam={selectHostTeam}
        onSubmit={(roundId, teamId, nextPoints) => void writeHostScore(roundId, teamId, nextPoints)}
        points={points}
        selectedTeam={selectedTeam}
        setPoints={setPoints}
        teams={hostTeams}
      />

      {hostStageError ? <Text style={styles.errorText}>{hostStageError}</Text> : null}
      {hostStageMessage ? <Text style={styles.positiveText}>{hostStageMessage}</Text> : null}
    </Screen>
  );
}
