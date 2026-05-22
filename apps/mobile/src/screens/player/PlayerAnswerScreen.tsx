import { Text, View } from 'react-native';
import { BadgeCheck } from 'lucide-react-native';

import { AnswerOption } from '../../components/game/AnswerOption';
import { Screen } from '../../components/layout/Screen';
import { useAppStyles } from '../../theme/useAppStyles';

export function PlayerAnswerScreen() {
  const { styles, theme } = useAppStyles();

  return (
    <Screen eyebrow="TRIVIA / TV + PHONES" title="Question 4">
      <View style={styles.questionPanel}>
        <View style={styles.rowBetween}>
          <Text style={styles.darkMeta}>09 seconds</Text>
          <Text style={styles.lightMeta}>+70 max</Text>
        </View>
        <Text style={styles.questionText}>Which planet spins fastest?</Text>
        <View style={styles.lockNote}>
          <BadgeCheck color={theme.palette.accent} size={15} />
          <Text style={styles.lockText}>Question shown here / first team answer counts</Text>
        </View>
      </View>
      <View style={styles.stack}>
        <AnswerOption keyLabel="A" label="Jupiter" selected />
        <AnswerOption keyLabel="B" label="Mars" />
        <AnswerOption keyLabel="C" label="Mercury" />
      </View>
    </Screen>
  );
}
