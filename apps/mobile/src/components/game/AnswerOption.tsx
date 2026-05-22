import { Text, View } from 'react-native';

import { useAppStyles } from '../../theme/useAppStyles';

interface AnswerOptionProps {
  keyLabel: string;
  label: string;
  selected?: boolean;
}

export function AnswerOption({ keyLabel, label, selected }: AnswerOptionProps) {
  const { styles } = useAppStyles();

  return (
    <View style={[styles.answerOption, selected && styles.answerSelected]}>
      <Text style={[styles.answerKey, selected && styles.answerKeySelected]}>{keyLabel}</Text>
      <Text style={[styles.answerLabel, selected && styles.answerLabelSelected]}>{label}</Text>
    </View>
  );
}
