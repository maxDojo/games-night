import { Pressable, Text, View } from 'react-native';

import { useAppStyles } from '../../theme/useAppStyles';
import type { GameDefinitionResponse } from '../../api/client';
import type { BuiltInSlug } from '../../lib/roundQueueConfig';

interface HostGamePickerProps {
  games: Array<GameDefinitionResponse & { slug: BuiltInSlug }>;
  selectedSlug: BuiltInSlug;
  disabled?: boolean;
  onSelect: (slug: BuiltInSlug) => void;
}

export function HostGamePicker({ games, selectedSlug, disabled, onSelect }: HostGamePickerProps) {
  const { styles } = useAppStyles();

  return (
    <View style={styles.stack}>
      {games.map((game) => {
        const selected = game.slug === selectedSlug;
        return (
          <Pressable
            key={game.id}
            disabled={disabled}
            onPress={() => onSelect(game.slug)}
            style={[styles.roundCard, selected && styles.roundSelected, disabled && styles.disabledCard]}
          >
            <Text style={[styles.roundNumber, selected && styles.roundTextSelected]}>{game.type.slice(0, 1)}</Text>
            <View style={styles.flex}>
              <Text style={[styles.roundTitle, selected && styles.roundTextSelected]}>{game.name}</Text>
              <Text style={[styles.roundDetail, selected && styles.roundTextSelected]}>{game.description}</Text>
            </View>
          </Pressable>
        );
      })}
      <View style={[styles.roundCard, styles.disabledCard]}>
        <Text style={styles.roundNumber}>C</Text>
        <View style={styles.flex}>
          <Text style={styles.roundTitle}>Custom games</Text>
          <Text style={styles.roundDetail}>Planned path: templates, manual scoring, audit log.</Text>
        </View>
      </View>
    </View>
  );
}
