import { Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

import { useAppStyles } from '../../theme/useAppStyles';

export function Pill({ label, icon: Icon }: { label: string; icon?: LucideIcon }) {
  const { styles, theme } = useAppStyles();

  return (
    <View style={styles.pill}>
      <View style={[styles.pillDot, { backgroundColor: theme.palette.success }]} />
      {Icon ? <Icon color={theme.palette.foreground} size={12} /> : null}
      <Text style={styles.pillText}>{label}</Text>
    </View>
  );
}

export function Token({ label, icon: Icon, color }: { label: string; icon: LucideIcon; color: string }) {
  const { styles, theme } = useAppStyles();

  return (
    <View style={[styles.token, { backgroundColor: color }]}>
      <Icon color={theme.palette.ink} size={22} />
      <Text style={styles.tokenText}>{label}</Text>
    </View>
  );
}
