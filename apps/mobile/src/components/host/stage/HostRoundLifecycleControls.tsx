import { View } from 'react-native';
import { Ban, Check, Play, RefreshCw } from 'lucide-react-native';

import { ActionButton } from '../../ui/ActionButton';
import { useAppStyles } from '../../../theme/useAppStyles';
import type { QueuedRoundSummary } from '../../../types/product';

interface HostRoundLifecycleControlsProps {
  activeRound?: QueuedRoundSummary;
  controlsDisabled: boolean;
  isControlling: boolean;
  isRefreshing: boolean;
  nextRound?: QueuedRoundSummary;
  onEnd: (roundId: string) => void;
  onRefresh: () => void;
  onSkip: (roundId: string) => void;
  onStart: (roundId: string) => void;
  startDisabled?: boolean;
}

export function HostRoundLifecycleControls({
  activeRound,
  controlsDisabled,
  isControlling,
  isRefreshing,
  nextRound,
  onEnd,
  onRefresh,
  onSkip,
  onStart,
  startDisabled,
}: HostRoundLifecycleControlsProps) {
  const { styles } = useAppStyles();

  return (
    <>
      <View style={styles.twoColumn}>
        <ActionButton
          label={activeRound ? 'Already live' : isControlling ? 'Starting...' : 'Start'}
          icon={Play}
          onPress={() => nextRound && onStart(nextRound.id)}
          disabled={controlsDisabled || startDisabled || Boolean(activeRound) || !nextRound}
          primary
        />
        <ActionButton
          label={isControlling ? 'Ending...' : 'End'}
          icon={Check}
          onPress={() => activeRound && onEnd(activeRound.id)}
          disabled={controlsDisabled || !activeRound}
          success
        />
      </View>
      <View style={styles.twoColumn}>
        <ActionButton
          label={isControlling ? 'Skipping...' : 'Skip next'}
          icon={Ban}
          onPress={() => nextRound && onSkip(nextRound.id)}
          disabled={controlsDisabled || Boolean(activeRound) || !nextRound}
          danger
        />
        <ActionButton
          label={isRefreshing ? 'Refreshing...' : 'Refresh'}
          icon={RefreshCw}
          onPress={onRefresh}
          disabled={controlsDisabled && !activeRound}
        />
      </View>
    </>
  );
}
