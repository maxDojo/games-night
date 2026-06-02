import type { ReactNode } from 'react';
import { ScrollView, Text } from 'react-native';

import { MotionView } from '../motion';
import { RoomTopBar } from './RoomTopBar';
import { useAppStyles } from '../../theme/useAppStyles';

interface ScreenProps {
  avatarLabel?: string;
  eyebrow?: string;
  immersive?: boolean;
  roomCode?: string;
  roomStatus?: string;
  title?: string;
  children: ReactNode;
}

export function Screen({ avatarLabel, eyebrow, immersive = false, roomCode, roomStatus, title, children }: ScreenProps) {
  const { styles } = useAppStyles();
  const showRoomBar = Boolean(roomCode || roomStatus || avatarLabel);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.screenContent, immersive && styles.screenContentImmersive]}
    >
      {showRoomBar ? <RoomTopBar avatarLabel={avatarLabel} roomCode={roomCode} status={roomStatus} /> : null}
      {eyebrow || title ? (
        <MotionView style={[styles.header, immersive && styles.headerImmersive]}>
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
