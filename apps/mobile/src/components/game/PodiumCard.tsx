import { Text } from 'react-native';
import { Crown } from 'lucide-react-native';

import { MotionView } from '../motion';
import { useAppStyles } from '../../theme/useAppStyles';

interface PodiumCardProps {
  rank: string;
  name: string;
  points: string;
  color: string;
  winner?: boolean;
}

export function PodiumCard({ rank, name, points, color, winner }: PodiumCardProps) {
  const { styles, theme } = useAppStyles();

  return (
    <MotionView variant={winner ? 'pop' : 'fade-up'} style={[styles.podiumCard, winner && styles.podiumWinner]}>
      {winner ? (
        <Crown color={theme.palette.ink} size={22} />
      ) : (
        <Text style={[styles.podiumRank, { color }]}>{rank}</Text>
      )}
      <Text style={[styles.podiumName, winner && styles.podiumTextDark]}>{name}</Text>
      <Text style={[styles.podiumPoints, winner && styles.podiumTextDark]}>{points}</Text>
    </MotionView>
  );
}
