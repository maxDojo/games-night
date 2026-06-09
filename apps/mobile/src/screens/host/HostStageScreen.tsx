import { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Flag, Play } from 'lucide-react-native';

import { QueuedRoundCard } from '../../components/game/QueuedRoundCard';
import { HostGameControls } from '../../components/host/stage/HostGameControls';
import { HostManualScoreCard } from '../../components/host/stage/HostManualScoreCard';
import { HostRoundLifecycleControls } from '../../components/host/stage/HostRoundLifecycleControls';
import { Screen } from '../../components/layout/Screen';
import { GlowPulse } from '../../components/motion';
import { GradientPanel } from '../../components/ui/GradientPanel';
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
    hostUser,
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
    <Screen
      avatarLabel={hostUser?.displayName}
      immersive
      roomCode={hostParty?.joinCode}
      roomStatus={activeRound ? 'LIVE' : hostParty?.status ?? 'DRAFT'}
    >
      <View style={styles.screenTitleBlock}>
        <Text style={styles.eyebrow}>HOST STAGE / PRIVATE CONTROLS</Text>
        <Text style={styles.screenTitle}>{activeRound?.label ?? nextRound?.label ?? 'Stage Control'}</Text>
        <Text style={styles.screenSubtitle}>
          Prompts stay on this host device. Players only receive actions intended for them.
        </Text>
      </View>
      <GlowPulse
        active={Boolean(activeRound)}
        borderRadius={theme.shape.cardRadius}
        color={theme.palette.success}
      >
        <GradientPanel
          colors={[theme.palette.warning, theme.palette.action, theme.palette.danger]}
          style={styles.stageGradientPanel}
        >
          <View style={styles.rowBetween}>
            <Text style={styles.gradientPanelMeta}>{activeRound ? 'ROUND IS LIVE' : 'READY STATE'}</Text>
            {activeRound ? (
              <Play color={theme.palette.success} size={18} />
            ) : (
              <Flag color={theme.palette.info} size={18} />
            )}
          </View>
          <Text style={styles.gradientPanelTitle}>
            {activeRound
              ? 'End the active round or write a manual score.'
              : waitingForHostSocket
                ? 'Host-only prompts need this phone online.'
                : nextRound
                  ? 'Start or skip the next queued round.'
                  : 'Queue rounds before using stage controls.'}
          </Text>
          <View style={styles.statRow}>
            <Stat value={queuedRounds.length.toString()} label="queued" accent />
            <Stat value={completedCount.toString()} label="done" />
            <Stat value={skippedCount.toString()} label="skipped" danger />
          </View>
        </GradientPanel>
      </GlowPulse>

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
