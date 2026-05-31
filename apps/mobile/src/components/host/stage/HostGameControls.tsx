import { Text, View } from 'react-native';
import { Gamepad2 } from 'lucide-react-native';

import { InfoBanner } from '../../ui/InfoBanner';
import { useAppStyles } from '../../../theme/useAppStyles';
import type { HostGamePrompt, HostTurnStatus, QueuedRoundSummary, TeamSummary } from '../../../types/product';
import { HostCharadesControls } from './HostCharadesControls';
import { HostTabooControls } from './HostTabooControls';
import { HostTriviaControls } from './HostTriviaControls';

interface HostGameControlsProps {
  connected: boolean;
  disabled: boolean;
  onEvent: (type: string, teamId: string, payload?: unknown) => void;
  prompt?: HostGamePrompt;
  round?: QueuedRoundSummary;
  selectedTeam?: TeamSummary;
  teams: TeamSummary[];
  turn?: HostTurnStatus;
}

export function HostGameControls({
  connected,
  disabled,
  onEvent,
  prompt,
  round,
  selectedTeam,
  teams,
  turn,
}: HostGameControlsProps) {
  const { styles, theme } = useAppStyles();

  if (!round) {
    return (
      <InfoBanner
        icon={Gamepad2}
        title="No active game controls"
        subtitle="Start a queued round to unlock host game controls."
        color={theme.palette.info}
      />
    );
  }

  if (round.kind === 'trivia') {
    return <HostTriviaControls connected={connected} round={round} turn={turn} />;
  }

  if (round.kind === 'charades') {
    return (
      <HostCharadesControls
        disabled={disabled}
        onEvent={onEvent}
        prompt={prompt?.kind === 'charades-phrase' && prompt.roundId === round.id ? prompt : undefined}
        teams={teams}
        turn={turn?.roundId === round.id ? turn : undefined}
      />
    );
  }

  if (round.kind === 'taboo') {
    return (
      <HostTabooControls
        disabled={disabled}
        onEvent={onEvent}
        prompt={prompt?.kind === 'taboo-card' && prompt.roundId === round.id ? prompt : undefined}
        selectedOpponent={selectedTeam}
        teams={teams}
        turn={turn?.roundId === round.id ? turn : undefined}
      />
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Custom controls planned</Text>
      <Text style={styles.bodyText}>
        Manual scoring is available now. Custom game controls come with the custom-game milestone.
      </Text>
    </View>
  );
}
