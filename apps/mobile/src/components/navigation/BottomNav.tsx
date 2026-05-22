import { Pressable, Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

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
            <Pressable
              key={item.route}
              style={[styles.navItem, isActive && styles.navItemActive]}
              onPress={() => onChange(item.route)}
            >
              <Icon color={isActive ? theme.palette.ink : theme.palette.muted} size={18} />
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
