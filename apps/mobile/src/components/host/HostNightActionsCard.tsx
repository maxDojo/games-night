import { Alert, Text, View } from 'react-native';
import { CalendarPlus, ClipboardList, Flag, Gift, Play } from 'lucide-react-native';

import { ActionButton } from '../ui/ActionButton';
import { InfoBanner } from '../ui/InfoBanner';
import { useAppStyles } from '../../theme/useAppStyles';

interface HostNightActionsCardProps {
  canEndNight: boolean;
  hasActiveRound: boolean;
  isEndingNight: boolean;
  isNightFinished: boolean;
  isRevealingScores: boolean;
  onEndNight: () => void;
  onRevealScores: () => void;
  scoresRevealed: boolean;
}

export function HostNightActionsCard({
  canEndNight,
  hasActiveRound,
  isEndingNight,
  isNightFinished,
  isRevealingScores,
  onEndNight,
  onRevealScores,
  scoresRevealed,
}: HostNightActionsCardProps) {
  const { styles, theme } = useAppStyles();

  const confirmEndNight = () => {
    Alert.alert(
      'End night?',
      'Scores will be revealed and this party will stop accepting joins, check-ins, and new rounds.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'End night', style: 'destructive', onPress: onEndNight },
      ],
    );
  };

  return (
    <>
      {isNightFinished ? (
        <InfoBanner
          icon={Flag}
          title="Night ended"
          subtitle="Scores are revealed. Next Week will create a separate party under the future persistent season."
          color={theme.palette.success}
        />
      ) : null}

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.metaLabelAccent}>NIGHT CONTROLS</Text>
          <Flag color={theme.palette.info} size={18} />
        </View>
        <Text style={styles.bodyText}>
          End Night closes this party. Next Week stays separate so past scores remain available.
        </Text>
        <View style={styles.twoColumn}>
          <ActionButton
            label="Start"
            icon={Play}
            onPress={() => undefined}
            disabled={!canEndNight || isNightFinished}
            primary
          />
          <ActionButton label="Score log" icon={ClipboardList} onPress={() => undefined} />
        </View>
        <View style={styles.twoColumn}>
          <ActionButton
            label={scoresRevealed ? 'Revealed' : 'Reveal'}
            icon={Gift}
            onPress={onRevealScores}
            disabled={!canEndNight || isNightFinished || scoresRevealed || isRevealingScores}
          />
          <ActionButton
            label={
              isNightFinished
                ? 'Night ended'
                : hasActiveRound
                  ? 'End active first'
                  : isEndingNight
                    ? 'Ending...'
                    : 'End night'
            }
            icon={Flag}
            onPress={confirmEndNight}
            disabled={!canEndNight || isNightFinished || isEndingNight || hasActiveRound}
            danger
          />
        </View>
        <ActionButton label="Next week" icon={CalendarPlus} onPress={() => undefined} disabled />
      </View>
    </>
  );
}
