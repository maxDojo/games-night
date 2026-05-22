import { useState } from 'react';
import { SafeAreaView, StatusBar } from 'react-native';

import { HostNav } from '../components/navigation/HostNav';
import { PlayerNav } from '../components/navigation/PlayerNav';
import { joinCode, teams } from '../data/mockState';
import { saveSession } from '../storage/sessionStore';
import { useAppStyles } from '../theme/useAppStyles';
import type { AppMode, HostRoute, PlayerRoute } from '../types/product';
import { HostLobbyScreen } from '../screens/host/HostLobbyScreen';
import { HostQueueScreen } from '../screens/host/HostQueueScreen';
import { HostStageScreen } from '../screens/host/HostStageScreen';
import { HostTeamsScreen } from '../screens/host/HostTeamsScreen';
import { PlayerAnswerScreen } from '../screens/player/PlayerAnswerScreen';
import { PlayerCheckInScreen } from '../screens/player/PlayerCheckInScreen';
import { PlayerStandingsScreen } from '../screens/player/PlayerStandingsScreen';
import { WelcomeScreen } from '../screens/WelcomeScreen';

export function AppShell() {
  const { styles } = useAppStyles();
  const [mode, setMode] = useState<AppMode>('welcome');
  const [playerRoute, setPlayerRoute] = useState<PlayerRoute>('check-in');
  const [hostRoute, setHostRoute] = useState<HostRoute>('lobby');

  const enterPlayer = () => {
    void saveSession({ joinCode, teamId: teams[0]?.id });
    setMode('player');
    setPlayerRoute('check-in');
  };

  const enterHost = () => {
    setMode('host');
    setHostRoute('lobby');
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" />
      {mode === 'welcome' ? (
        <WelcomeScreen onHost={enterHost} onPlayer={enterPlayer} />
      ) : mode === 'player' ? (
        <>
          {playerRoute === 'check-in' ? <PlayerCheckInScreen /> : null}
          {playerRoute === 'answer' ? <PlayerAnswerScreen /> : null}
          {playerRoute === 'standings' ? <PlayerStandingsScreen /> : null}
          <PlayerNav active={playerRoute} onChange={setPlayerRoute} />
        </>
      ) : (
        <>
          {hostRoute === 'lobby' ? <HostLobbyScreen /> : null}
          {hostRoute === 'queue' ? <HostQueueScreen /> : null}
          {hostRoute === 'stage' ? <HostStageScreen /> : null}
          {hostRoute === 'teams' ? <HostTeamsScreen /> : null}
          <HostNav active={hostRoute} onChange={setHostRoute} />
        </>
      )}
    </SafeAreaView>
  );
}
