import { Text, View } from 'react-native';
import { Menu, UserRound } from 'lucide-react-native';

import { useAppStyles } from '../../theme/useAppStyles';

interface RoomTopBarProps {
  avatarLabel?: string;
  roomCode?: string;
  status?: string;
}

export function RoomTopBar({ avatarLabel = 'GN', roomCode = '------', status }: RoomTopBarProps) {
  const { styles, theme } = useAppStyles();
  const initials = avatarLabel
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.slice(0, 1).toUpperCase())
    .join('');

  return (
    <View style={styles.roomTopBar}>
      <View style={styles.roomTopIcon}>
        <Menu color={theme.palette.subtleText} size={17} />
      </View>
      <View style={styles.roomTopCopy}>
        <Text style={styles.roomTopLabel}>ROOM CODE: {roomCode}</Text>
        {status ? <Text style={styles.roomTopStatus}>{status}</Text> : null}
      </View>
      <View style={styles.roomAvatar}>
        {initials ? (
          <Text style={styles.roomAvatarText}>{initials}</Text>
        ) : (
          <UserRound color={theme.palette.onAccent} size={16} />
        )}
      </View>
    </View>
  );
}
