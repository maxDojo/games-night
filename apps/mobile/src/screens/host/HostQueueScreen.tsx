import { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { ClipboardList, Plus, RefreshCw, Save } from 'lucide-react-native';

import { QueuedRoundCard } from '../../components/game/QueuedRoundCard';
import { HostGamePicker } from '../../components/host/HostGamePicker';
import { HostRoundConfigCard } from '../../components/host/HostRoundConfigCard';
import { Screen } from '../../components/layout/Screen';
import { ActionButton } from '../../components/ui/ActionButton';
import { InfoBanner } from '../../components/ui/InfoBanner';
import { usePartyState } from '../../state/PartyState';
import { useAppStyles } from '../../theme/useAppStyles';
import {
  buildQueueRequest,
  getConfigFromDefaults,
  isBuiltInGame,
  isValidConfig,
  type BuiltInSlug,
  type NumericConfig,
} from '../../lib/roundQueueConfig';

export function HostQueueScreen() {
  const { styles, theme } = useAppStyles();
  const {
    hostGames,
    hostParty,
    hostQueueError,
    isLoadingHostGames,
    isLoadingHostRounds,
    isQueueingHostRound,
    queueHostRound,
    queuedRounds,
    refreshHostRoundSetup,
  } = usePartyState();
  const availableGames = useMemo(() => hostGames.filter(isBuiltInGame), [hostGames]);
  const [selectedSlug, setSelectedSlug] = useState<BuiltInSlug>('trivia');
  const selectedGame = availableGames.find((game) => game.slug === selectedSlug) ?? availableGames[0];
  const [triviaConfig, setTriviaConfig] = useState<NumericConfig>({ basePoints: '100', seconds: '20', count: '10' });
  const [turnConfig, setTurnConfig] = useState<NumericConfig>({ basePoints: '100', seconds: '60', count: '3' });

  useEffect(() => {
    void refreshHostRoundSetup();
  }, [refreshHostRoundSetup]);

  useEffect(() => {
    if (selectedGame && selectedGame.slug !== selectedSlug) {
      setSelectedSlug(selectedGame.slug);
    }
  }, [selectedGame, selectedSlug]);

  useEffect(() => {
    const defaults = getConfigFromDefaults(selectedGame);
    if (selectedGame?.slug === 'trivia') {
      setTriviaConfig(defaults);
      return;
    }

    setTurnConfig(defaults);
  }, [selectedGame]);

  const activeConfig = selectedSlug === 'trivia' ? triviaConfig : turnConfig;
  const queueDisabled = !hostParty || !selectedGame || isQueueingHostRound || !isValidConfig(activeConfig);

  const handleQueueRound = async () => {
    if (selectedGame) {
      await queueHostRound(buildQueueRequest(selectedGame.slug, activeConfig));
    }
  };

  const updateActiveConfig = (key: keyof NumericConfig, value: string) => {
    const updater = (current: NumericConfig) => ({ ...current, [key]: value });
    if (selectedSlug === 'trivia') {
      setTriviaConfig(updater);
      return;
    }

    setTurnConfig(updater);
  };

  return (
    <Screen eyebrow="QUEUE LAB / TV + PHONES" title="Build the run">
      <InfoBanner
        icon={Save}
        title={hostParty ? `Plan: ${hostParty.name}` : 'Create a party first'}
        subtitle={
          hostParty
            ? 'Queue built-in rounds with server defaults plus host point/timer overrides.'
            : 'Party creation lives in the host lobby. Round queueing unlocks after that.'
        }
        color={hostParty ? theme.palette.danger : theme.palette.info}
      />

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.metaLabelAccent}>GAME</Text>
          <Text style={styles.positiveText}>{isLoadingHostGames ? 'Loading' : `${availableGames.length} built-ins`}</Text>
        </View>
        <HostGamePicker
          disabled={!hostParty || isQueueingHostRound}
          games={availableGames}
          selectedSlug={selectedSlug}
          onSelect={setSelectedSlug}
        />
      </View>

      <HostRoundConfigCard selectedSlug={selectedSlug} config={activeConfig} onChange={updateActiveConfig} />

      {hostQueueError ? <Text style={styles.errorText}>{hostQueueError}</Text> : null}

      <View style={styles.twoColumn}>
        <ActionButton
          label={isQueueingHostRound ? 'Queueing...' : 'Queue'}
          icon={Plus}
          onPress={handleQueueRound}
          disabled={queueDisabled}
          primary
        />
        <ActionButton
          label={isLoadingHostRounds ? 'Refreshing...' : 'Refresh'}
          icon={RefreshCw}
          onPress={() => void refreshHostRoundSetup()}
          disabled={!hostParty || isLoadingHostRounds || isLoadingHostGames}
        />
      </View>

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.metaLabelAccent}>QUEUED ROUNDS</Text>
          <ClipboardList color={theme.palette.info} size={18} />
        </View>
        <View style={styles.stack}>
          {queuedRounds.length > 0 ? (
            queuedRounds.map((round) => <QueuedRoundCard key={round.id} round={round} />)
          ) : (
            <Text style={styles.bodyText}>
              No rounds queued yet. Pick a built-in game, adjust the points or timer, then add it to tonight's run.
            </Text>
          )}
        </View>
      </View>
    </Screen>
  );
}
