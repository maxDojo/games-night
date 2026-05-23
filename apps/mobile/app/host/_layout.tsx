import { useEffect } from 'react';
import { Slot, router, usePathname } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HostNav } from '../../src/components/navigation/HostNav';
import { usePartyState } from '../../src/state/PartyState';
import { useAppStyles } from '../../src/theme/useAppStyles';
import type { HostRoute } from '../../src/types/product';

const hostRoutes: HostRoute[] = ['lobby', 'queue', 'teams', 'stage'];

export default function HostLayout() {
  const pathname = usePathname();
  const { styles } = useAppStyles();
  const { isHostAuthenticated, isRestoringHostSession } = usePartyState();
  const isAuthRoute = pathname.endsWith('/host/auth');
  const activeRoute = hostRoutes.find((route) => pathname.endsWith(`/host/${route}`)) ?? 'lobby';

  useEffect(() => {
    if (isRestoringHostSession) {
      return;
    }

    if (!isHostAuthenticated && !isAuthRoute) {
      router.replace('/host/auth');
      return;
    }

    if (isHostAuthenticated && isAuthRoute) {
      router.replace('/host/lobby');
    }
  }, [isAuthRoute, isHostAuthenticated, isRestoringHostSession]);

  if (isRestoringHostSession || (!isHostAuthenticated && !isAuthRoute)) {
    return <SafeAreaView style={styles.root} edges={['top', 'left', 'right']} />;
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <Slot />
      {isAuthRoute ? null : <HostNav active={activeRoute} onChange={(route) => router.replace(`/host/${route}`)} />}
    </SafeAreaView>
  );
}
