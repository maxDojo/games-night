import { Slot, router, usePathname } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HostNav } from '../../src/components/navigation/HostNav';
import { useAppStyles } from '../../src/theme/useAppStyles';
import type { HostRoute } from '../../src/types/product';

const hostRoutes: HostRoute[] = ['lobby', 'queue', 'teams', 'stage'];

export default function HostLayout() {
  const pathname = usePathname();
  const { styles } = useAppStyles();
  const activeRoute = hostRoutes.find((route) => pathname.endsWith(`/host/${route}`)) ?? 'lobby';

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <Slot />
      <HostNav active={activeRoute} onChange={(route) => router.replace(`/host/${route}`)} />
    </SafeAreaView>
  );
}
