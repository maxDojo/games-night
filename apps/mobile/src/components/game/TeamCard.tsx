import { Text, View } from 'react-native';
import { Check } from 'lucide-react-native';

import { useAppStyles } from '../../theme/useAppStyles';
import type { TeamSummary } from '../../types/product';

interface TeamCardProps {
  team: TeamSummary;
  selected?: boolean;
}

export function TeamCard({ team, selected }: TeamCardProps) {
  const { styles, theme } = useAppStyles();
  const full = team.checkedIn >= team.capacity;

  return (
    <View style={[styles.teamCard, selected && styles.teamCardSelected]}>
      <View style={[styles.teamGlyph, { backgroundColor: selected ? theme.palette.ink : team.color }]}>
        <Text style={[styles.teamGlyphText, selected && { color: team.color }]}>{team.shortName}</Text>
      </View>
      <View style={styles.flex}>
        <Text style={[styles.teamName, selected && styles.teamNameSelected]}>{team.name}</Text>
        <Text style={[styles.teamMeta, selected && styles.teamMetaSelected]}>
          {team.checkedIn}/{team.capacity} {full ? 'full' : 'checked in'} / {team.points.toLocaleString()} pts
        </Text>
      </View>
      {selected ? <Check color={theme.palette.ink} size={21} /> : null}
    </View>
  );
}
