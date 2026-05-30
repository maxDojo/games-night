import type { ReactNode } from 'react';
import { ScrollView, Text } from 'react-native';

import { MotionView } from '../motion';
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
        <MotionView style={styles.header}>
          {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
          {title ? <Text style={styles.title}>{title}</Text> : null}
        </MotionView>
      ) : null}
      <MotionView delay={70} style={styles.stack}>
        {children}
      </MotionView>
    </ScrollView>
  );
}
