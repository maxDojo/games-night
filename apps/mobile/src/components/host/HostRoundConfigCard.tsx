import { Text, TextInput, View } from 'react-native';
import { SlidersHorizontal } from 'lucide-react-native';

import { useAppStyles } from '../../theme/useAppStyles';
import type { BuiltInSlug, NumericConfig } from '../../lib/roundQueueConfig';

interface HostRoundConfigCardProps {
  selectedSlug: BuiltInSlug;
  config: NumericConfig;
  onChange: (key: keyof NumericConfig, value: string) => void;
}

export function HostRoundConfigCard({ selectedSlug, config, onChange }: HostRoundConfigCardProps) {
  const { styles, theme } = useAppStyles();

  return (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <Text style={styles.metaLabelAccent}>CONFIG</Text>
        <SlidersHorizontal color={theme.palette.info} size={18} />
      </View>
      <View style={styles.threeColumn}>
        <ConfigInput
          label={selectedSlug === 'trivia' ? 'BASE PTS' : 'PTS / HIT'}
          value={config.basePoints}
          onChange={(value) => onChange('basePoints', value)}
        />
        <ConfigInput
          label={selectedSlug === 'trivia' ? 'SECONDS' : 'TURN SEC'}
          value={config.seconds}
          onChange={(value) => onChange('seconds', value)}
        />
        <ConfigInput
          label={selectedSlug === 'trivia' ? 'QUESTIONS' : 'MAX SKIPS'}
          value={config.count}
          onChange={(value) => onChange('count', value)}
        />
      </View>
    </View>
  );
}

function ConfigInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const { styles, theme } = useAppStyles();

  return (
    <View style={[styles.inputGroup, styles.flex]}>
      <Text style={styles.metaLabelAccent}>{label}</Text>
      <TextInput
        keyboardType="number-pad"
        maxLength={4}
        onChangeText={(nextValue) => onChange(nextValue.replace(/\D/gu, '').slice(0, 4))}
        placeholder="0"
        placeholderTextColor={theme.palette.muted}
        style={styles.textInput}
        value={value}
      />
    </View>
  );
}
