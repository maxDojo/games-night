import { Text, View } from 'react-native';
import { AlertTriangle, Check, SkipForward } from 'lucide-react-native';

import { AnimatedPressable } from '../../motion';
import { ActionButton } from '../../ui/ActionButton';
import { useAppStyles } from '../../../theme/useAppStyles';
import type { HostGamePrompt, HostTurnStatus, TeamSummary } from '../../../types/product';

interface HostTabooControlsProps {
  disabled: boolean;
  onEvent: (type: string, teamId: string, payload?: unknown) => void;
  prompt?: Extract<HostGamePrompt, { kind: 'taboo-card' }>;
  selectedOpponent?: TeamSummary;
  teams: TeamSummary[];
  turn?: HostTurnStatus;
}

export function HostTabooControls({
  disabled,
  onEvent,
  prompt,
  selectedOpponent,
  teams,
  turn,
}: HostTabooControlsProps) {
  const { styles, theme } = useAppStyles();
  const activeTeam = teams.find((team) => team.id === (prompt?.teamId ?? turn?.teamId));
  const challenger = prompt && selectedOpponent?.id === prompt.teamId
    ? teams.find((team) => team.id !== prompt.teamId)
    : selectedOpponent ?? teams.find((team) => team.id !== prompt?.teamId);

  return (
    <View style={styles.secretCard}>
      <View style={styles.rowBetween}>
        <Text style={styles.darkMeta}>TABOO CARD</Text>
        <AlertTriangle color={theme.palette.warning} size={18} />
      </View>
      <View>
        <Text style={styles.secretWord}>{prompt?.word ?? 'Waiting for card'}</Text>
        <Text style={styles.teamMetaSelected}>
          {activeTeam ? `${activeTeam.name} guessing` : 'The active team will appear here.'}
        </Text>
      </View>
      <View style={styles.threeColumn}>
        {prompt?.forbidden.map((word) => (
          <AnimatedPressable
            key={word}
            disabled={disabled || !challenger}
            onPress={() => challenger && onEvent('taboo', challenger.id, { forbiddenWord: word })}
            style={styles.forbiddenWord}
          >
            <Text style={styles.forbiddenText}>{word}</Text>
          </AnimatedPressable>
        ))}
      </View>
      <View style={styles.twoColumn}>
        <ActionButton
          label="Correct"
          icon={Check}
          onPress={() => prompt && onEvent('correct', prompt.teamId)}
          disabled={disabled || !prompt}
          success
        />
        <ActionButton
          label="Skip"
          icon={SkipForward}
          onPress={() => prompt && onEvent('skip', prompt.teamId)}
          disabled={disabled || !prompt}
        />
      </View>
    </View>
  );
}
