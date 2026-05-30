import { Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

import { AnimatedPressable, MotionView } from '../motion';
import { useAppStyles } from '../../theme/useAppStyles';

interface BottomNavProps<T extends string> {
  items: Array<{ route: T; label: string; icon: LucideIcon }>;
  active: T;
  onChange: (route: T) => void;
}

export function BottomNav<T extends string>({ items, active, onChange }: BottomNavProps<T>) {
  const { styles, theme } = useAppStyles();

  return (
    <View style={styles.navWrap}>
      <View style={styles.navPill}>
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = item.route === active;
          return (
            <MotionView key={item.route} style={styles.flex} variant="pop" delay={isActive ? 0 : 25}>
              <AnimatedPressable
                style={[styles.navItem, isActive && styles.navItemActive]}
                onPress={() => onChange(item.route)}
                pressedScale={0.94}
              >
                <Icon color={isActive ? theme.palette.ink : theme.palette.muted} size={18} />
                <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>{item.label}</Text>
              </AnimatedPressable>
            </MotionView>
          );
        })}
      </View>
    </View>
  );
}
