import { Text, View } from 'react-native';
import { Check, EyeOff, SkipForward } from 'lucide-react-native';

import { ActionButton } from '../../ui/ActionButton';
import { useAppStyles } from '../../../theme/useAppStyles';
import type { HostGamePrompt, HostTurnStatus, TeamSummary } from '../../../types/product';

interface HostCharadesControlsProps {
  disabled: boolean;
  onEvent: (type: string, teamId: string) => void;
  prompt?: Extract<HostGamePrompt, { kind: 'charades-phrase' }>;
  teams: TeamSummary[];
  turn?: HostTurnStatus;
}

export function HostCharadesControls({ disabled, onEvent, prompt, teams, turn }: HostCharadesControlsProps) {
  const { styles, theme } = useAppStyles();
  const activeTeam = teams.find((team) => team.id === (prompt?.teamId ?? turn?.teamId));

  return (
    <View style={styles.secretCard}>
      <View style={styles.rowBetween}>
        <Text style={styles.darkMeta}>CHARADES PROMPT</Text>
        <EyeOff color={theme.palette.accent} size={18} />
      </View>
      <View>
        <Text style={styles.secretWord}>{prompt?.phrase ?? 'Waiting for phrase'}</Text>
        <Text style={styles.teamMetaSelected}>
          {activeTeam ? `${activeTeam.name} acting` : 'The next acting team will appear here.'}
        </Text>
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
