import { Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

import { GlowPulse, LivePulse, MotionView } from '../motion';
import { useAppStyles } from '../../theme/useAppStyles';

interface InfoBannerProps {
  icon: LucideIcon;
  live?: boolean;
  title: string;
  subtitle: string;
  color: string;
}

export function InfoBanner({ icon: Icon, live, title, subtitle, color }: InfoBannerProps) {
  const { styles, theme } = useAppStyles();

  return (
    <GlowPulse
      active={live}
      borderRadius={theme.shape.cardRadius}
      color={color}
    >
      <MotionView variant="pop" style={[styles.infoBanner, { backgroundColor: color }]}>
        <View style={styles.infoIconWrap}>
          <Icon color={theme.palette.onInfo} size={24} />
          {live ? <LivePulse color={theme.palette.onInfo} size={7} /> : null}
        </View>
        <View style={styles.flex}>
          <Text style={styles.infoTitle}>{title}</Text>
          <Text style={styles.infoSubtitle}>{subtitle}</Text>
        </View>
      </MotionView>
    </GlowPulse>
  );
}
