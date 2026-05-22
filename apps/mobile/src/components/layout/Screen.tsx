import type { ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { useAppStyles } from '../../theme/useAppStyles';

interface ScreenProps {
  eyebrow?: string;
  title?: string;
  children: ReactNode;
}

export function Screen({ eyebrow, title, children }: ScreenProps) {
  const { styles } = useAppStyles();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent}>
      {eyebrow || title ? (
        <View style={styles.header}>
          {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
          {title ? <Text style={styles.title}>{title}</Text> : null}
        </View>
      ) : null}
      {children}
    </ScrollView>
  );
}
