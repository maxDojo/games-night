import { useEffect, useMemo, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { Ban, Check, Flag, Play, RefreshCw, Save } from 'lucide-react-native';

import { QueuedRoundCard } from '../../components/game/QueuedRoundCard';
import { TeamCard } from '../../components/game/TeamCard';
import { Screen } from '../../components/layout/Screen';
import { ActionButton } from '../../components/ui/ActionButton';
import { InfoBanner } from '../../components/ui/InfoBanner';
import { Stat } from '../../components/ui/Stat';
import { usePartyState } from '../../state/PartyState';
import { useAppStyles } from '../../theme/useAppStyles';

export function HostStageScreen() {
  const { styles, theme } = useAppStyles();
  const {
    endHostRound,
    hostParty,
    hostStageError,
    hostStageMessage,
    hostTeams,
    isControllingHostRound,
    isLoadingHostRounds,
    isWritingHostScore,
    queuedRounds,
    refreshHostRoundSetup,
    refreshHostTeams,
    selectedHostTeamId,
    selectHostTeam,
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

  const handleWriteScore = async () => {
    if (!activeRound || !selectedTeam) {
      return;
    }

    await writeHostScore(activeRound.id, selectedTeam.id, Number(points));
  };

  const controlsDisabled = !hostParty || isControllingHostRound || isLoadingHostRounds;
  const scoreDisabled = !activeRound || !selectedTeam || isWritingHostScore || Number(points) < 0;

  return (
    <Screen eyebrow="ROUND CONTROL / HOST ONLY" title={activeRound?.label ?? nextRound?.label ?? 'Stage control'}>
      <InfoBanner
        icon={activeRound ? Play : Flag}
        title={activeRound ? 'Round is live' : hostParty ? 'Ready for next round' : 'Create a party first'}
        subtitle={
          activeRound
            ? 'End the active round or save manual scores while it is live.'
            : nextRound
              ? 'Start or skip the next queued round from this phone.'
              : 'Queue rounds before using stage controls.'
        }
        color={activeRound ? theme.palette.success : theme.palette.info}
      />

      <View style={styles.statRow}>
        <Stat value={queuedRounds.length.toString()} label="queued" accent />
        <Stat value={completedCount.toString()} label="done" />
        <Stat value={skippedCount.toString()} label="skipped" danger />
      </View>

      {activeRound ? <QueuedRoundCard round={activeRound} /> : null}
      {!activeRound && nextRound ? <QueuedRoundCard round={nextRound} /> : null}

      <View style={styles.twoColumn}>
        <ActionButton
          label={activeRound ? 'Already live' : isControllingHostRound ? 'Starting...' : 'Start'}
          icon={Play}
          onPress={() => nextRound && void startHostRound(nextRound.id)}
          disabled={controlsDisabled || Boolean(activeRound) || !nextRound}
          primary
        />
        <ActionButton
          label={isControllingHostRound ? 'Ending...' : 'End'}
          icon={Check}
          onPress={() => activeRound && void endHostRound(activeRound.id)}
          disabled={controlsDisabled || !activeRound}
          success
        />
      </View>

      <View style={styles.twoColumn}>
        <ActionButton
          label={isControllingHostRound ? 'Skipping...' : 'Skip next'}
          icon={Ban}
          onPress={() => nextRound && void skipHostRound(nextRound.id)}
          disabled={controlsDisabled || Boolean(activeRound) || !nextRound}
          danger
        />
        <ActionButton
          label={isLoadingHostRounds ? 'Refreshing...' : 'Refresh'}
          icon={RefreshCw}
          onPress={() => {
            void refreshHostRoundSetup();
            void refreshHostTeams();
          }}
          disabled={!hostParty || isLoadingHostRounds}
        />
      </View>

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.metaLabelAccent}>MANUAL SCORE</Text>
          <Save color={theme.palette.info} size={18} />
        </View>
        <Text style={styles.bodyText}>
          Saves a team score for the active round. Detailed correction history stays for the score audit API slice.
        </Text>
        <View style={styles.inputGroup}>
          <Text style={styles.metaLabelAccent}>POINTS</Text>
          <TextInput
            editable={Boolean(activeRound) && !isWritingHostScore}
            keyboardType="number-pad"
            maxLength={5}
            onChangeText={(value) => setPoints(value.replace(/\D/gu, '').slice(0, 5))}
            placeholder="100"
            placeholderTextColor={theme.palette.muted}
            style={styles.textInput}
            value={points}
          />
        </View>
        <View style={styles.stack}>
          {hostTeams.length > 0 ? (
            hostTeams.map((team) => (
              <TeamCard
                key={team.id}
                team={team}
                selected={team.id === selectedTeam?.id}
                showPoints={false}
                onPress={() => selectHostTeam(team.id)}
              />
            ))
          ) : (
            <Text style={styles.bodyText}>Create teams before writing manual scores.</Text>
          )}
        </View>
      </View>

      {hostStageError ? <Text style={styles.errorText}>{hostStageError}</Text> : null}
      {hostStageMessage ? <Text style={styles.positiveText}>{hostStageMessage}</Text> : null}

      <ActionButton
        label={isWritingHostScore ? 'Saving...' : 'Save score'}
        icon={Save}
        onPress={handleWriteScore}
        disabled={scoreDisabled}
        primary
      />
    </Screen>
  );
}
