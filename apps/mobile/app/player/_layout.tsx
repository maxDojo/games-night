import { Slot, router, usePathname } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PlayerNav } from '../../src/components/navigation/PlayerNav';
import { useAppStyles } from '../../src/theme/useAppStyles';
import type { PlayerRoute, PlayerTabRoute } from '../../src/types/product';

const playerRoutes: PlayerRoute[] = ['check-in', 'answer', 'report'];
const playerTabRoutes: PlayerTabRoute[] = ['answer', 'report'];

export default function PlayerLayout() {
  const pathname = usePathname();
  const { styles } = useAppStyles();
  const activeRoute = playerRoutes.find((route) => pathname.endsWith(`/player/${route}`)) ?? 'check-in';
  const activeTabRoute = playerTabRoutes.find((route) => route === activeRoute);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <Slot />
      {activeTabRoute ? (
        <PlayerNav active={activeTabRoute} onChange={(route) => router.replace(`/player/${route}`)} />
      ) : null}
    </SafeAreaView>
  );
}
