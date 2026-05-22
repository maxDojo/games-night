import { Slot, router, usePathname } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PlayerNav } from '../../src/components/navigation/PlayerNav';
import { useAppStyles } from '../../src/theme/useAppStyles';
import type { PlayerRoute } from '../../src/types/product';

const playerRoutes: PlayerRoute[] = ['check-in', 'answer', 'standings'];

export default function PlayerLayout() {
  const pathname = usePathname();
  const { styles } = useAppStyles();
  const activeRoute = playerRoutes.find((route) => pathname.endsWith(`/player/${route}`)) ?? 'check-in';

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <Slot />
      <PlayerNav active={activeRoute} onChange={(route) => router.replace(`/player/${route}`)} />
    </SafeAreaView>
  );
}
