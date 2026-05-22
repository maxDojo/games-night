import { Text, View } from 'react-native';
import { Ban, Check, EyeOff } from 'lucide-react-native';

import { ForbiddenWord } from '../../components/game/ForbiddenWord';
import { Screen } from '../../components/layout/Screen';
import { ActionButton } from '../../components/ui/ActionButton';
import { Stat } from '../../components/ui/Stat';
import { useAppStyles } from '../../theme/useAppStyles';

export function HostStageScreen() {
  const { styles, theme } = useAppStyles();

  return (
    <Screen eyebrow="PRIVATE STAGE / HOST ONLY" title="Taboo">
      <View style={styles.timerCard}>
        <Text style={styles.timerText}>00:39</Text>
        <Text style={styles.timerSubtext}>clue-giver has the phone</Text>
      </View>
      <View style={styles.secretCard}>
        <View style={styles.rowBetween}>
          <Text style={styles.darkMeta}>HOST PHONE ONLY / DO NOT CAST</Text>
          <EyeOff color={theme.palette.ink} size={18} />
        </View>
        <Text style={styles.secretWord}>Spreadsheet</Text>
        <View style={styles.threeColumn}>
          <ForbiddenWord label="Excel" />
          <ForbiddenWord label="Cells" />
          <ForbiddenWord label="Rows" />
        </View>
      </View>
      <View style={styles.twoColumn}>
        <ActionButton label="Correct" icon={Check} onPress={() => undefined} success />
        <ActionButton label="Taboo" icon={Ban} onPress={() => undefined} danger />
      </View>
      <View style={styles.statRow}>
        <Stat value="5" label="correct" />
        <Stat value="1" label="taboo" danger />
        <Stat value="650" label="points" accent />
      </View>
    </Screen>
  );
}
