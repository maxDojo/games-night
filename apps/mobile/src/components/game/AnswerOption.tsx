import { Text } from 'react-native';

import { AnimatedPressable, MotionView } from '../motion';
import { useAppStyles } from '../../theme/useAppStyles';

interface AnswerOptionProps {
  keyLabel: string;
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
}

export function AnswerOption({ keyLabel, label, selected, disabled, onPress }: AnswerOptionProps) {
  const { styles } = useAppStyles();

  return (
    <MotionView variant={selected ? 'pop' : 'fade-up'}>
      <AnimatedPressable
        disabled={disabled}
        style={[styles.answerOption, selected && styles.answerSelected, disabled && !selected && styles.disabledCard]}
        onPress={onPress}
      >
        <Text style={[styles.answerKey, selected && styles.answerKeySelected]}>{keyLabel}</Text>
        <Text style={[styles.answerLabel, selected && styles.answerLabelSelected]}>{label}</Text>
      </AnimatedPressable>
    </MotionView>
  );
}
