import { Slot, router, usePathname } from 'expo-router';
import { useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PlayerNav } from '../../src/components/navigation/PlayerNav';
import { usePartyState } from '../../src/state/PartyState';
import { useAppStyles } from '../../src/theme/useAppStyles';
import type { PlayerRoute, PlayerTabRoute } from '../../src/types/product';

const playerRoutes: PlayerRoute[] = ['check-in', 'answer', 'report'];
const playerTabRoutes: PlayerTabRoute[] = ['answer', 'report'];

export default function PlayerLayout() {
  const pathname = usePathname();
  const { checkedInTeam } = usePartyState();
  const { styles } = useAppStyles();
  const activeRoute = playerRoutes.find((route) => pathname.endsWith(`/player/${route}`)) ?? 'check-in';
  const activeTabRoute = playerTabRoutes.find((route) => route === activeRoute);

  useEffect(() => {
    if (activeTabRoute && !checkedInTeam) {
      router.replace('/player/check-in');
    }
  }, [activeTabRoute, checkedInTeam]);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <Slot />
      {activeTabRoute && checkedInTeam ? (
        <PlayerNav active={activeTabRoute} onChange={(route) => router.replace(`/player/${route}`)} />
      ) : null}
    </SafeAreaView>
  );
}
