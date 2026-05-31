import { Text, TextInput, View } from 'react-native';
import { Save } from 'lucide-react-native';

import { TeamCard } from '../../game/TeamCard';
import { ActionButton } from '../../ui/ActionButton';
import { useAppStyles } from '../../../theme/useAppStyles';
import type { TeamSummary } from '../../../types/product';

interface HostManualScoreCardProps {
  activeRoundId?: string;
  disabled: boolean;
  isWriting: boolean;
  onSelectTeam: (teamId: string) => void;
  onSubmit: (roundId: string, teamId: string, points: number) => void;
  points: string;
  selectedTeam?: TeamSummary;
  setPoints: (points: string) => void;
  teams: TeamSummary[];
}

export function HostManualScoreCard({
  activeRoundId,
  disabled,
  isWriting,
  onSelectTeam,
  onSubmit,
  points,
  selectedTeam,
  setPoints,
  teams,
}: HostManualScoreCardProps) {
  const { styles, theme } = useAppStyles();
  const scoreDisabled = disabled || !activeRoundId || !selectedTeam || isWriting || Number(points) < 0;

  return (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <Text style={styles.metaLabelAccent}>MANUAL SCORE</Text>
        <Save color={theme.palette.info} size={18} />
      </View>
      <Text style={styles.bodyText}>
        Saves a team score for the active round. Detailed correction history stays for the score audit API slice.
      </Text>
      <View style={styles.inputGroup}>
        <Text style={styles.metaLabelAccent}>POINTS</Text>
        <TextInput
          editable={Boolean(activeRoundId) && !isWriting}
          keyboardType="number-pad"
          maxLength={5}
          onChangeText={(value) => setPoints(value.replace(/\D/gu, '').slice(0, 5))}
          placeholder="100"
          placeholderTextColor={theme.palette.muted}
          style={styles.textInput}
          value={points}
        />
      </View>
      <View style={styles.stack}>
        {teams.length > 0 ? (
          teams.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              selected={team.id === selectedTeam?.id}
              showPoints={false}
              onPress={() => onSelectTeam(team.id)}
            />
          ))
        ) : (
          <Text style={styles.bodyText}>Create teams before writing manual scores.</Text>
        )}
      </View>
      <ActionButton
        label={isWriting ? 'Saving...' : 'Save score'}
        icon={Save}
        onPress={() => activeRoundId && selectedTeam && onSubmit(activeRoundId, selectedTeam.id, Number(points))}
        disabled={scoreDisabled}
        primary
      />
    </View>
  );
}
