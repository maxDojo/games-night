import { Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

import { useAppStyles } from '../../theme/useAppStyles';

interface InfoBannerProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  color: string;
}

export function InfoBanner({ icon: Icon, title, subtitle, color }: InfoBannerProps) {
  const { styles, theme } = useAppStyles();

  return (
    <View style={[styles.infoBanner, { backgroundColor: color }]}>
      <Icon color={theme.palette.ink} size={24} />
      <View style={styles.flex}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}
