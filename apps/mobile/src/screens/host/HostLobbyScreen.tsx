import { Text, View } from 'react-native';
import { ClipboardList, Play } from 'lucide-react-native';

import { Screen } from '../../components/layout/Screen';
import { ActionButton } from '../../components/ui/ActionButton';
import { Pill } from '../../components/ui/Badges';
import { Stat } from '../../components/ui/Stat';
import { joinCode } from '../../data/mockState';
import { useAppStyles } from '../../theme/useAppStyles';

export function HostLobbyScreen() {
  const { styles, theme } = useAppStyles();

  return (
    <Screen eyebrow="THEMED ROOM" title={theme.displayName}>
      <View style={styles.roomCard}>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.metaLabelLight}>ROOM CODE</Text>
            <Text style={styles.bigCode}>{joinCode}</Text>
          </View>
          <Pill label="LIVE" />
        </View>
        <View style={styles.statRow}>
          <Stat value="3" label="teams" />
          <Stat value="19" label="players" />
          <Stat value="6" label="rounds" />
        </View>
      </View>
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.metaLabelAccent}>NEXT ROUND</Text>
          <Text style={styles.positiveText}>650 pts</Text>
        </View>
        <Text style={styles.cardTitle}>Custom: Word Scramble</Text>
        <Text style={styles.bodyText}>
          Manual score round. Corrections require a reason and stay visible in the score log.
        </Text>
      </View>
      <View style={styles.twoColumn}>
        <ActionButton label="Start" icon={Play} onPress={() => undefined} primary />
        <ActionButton label="Score log" icon={ClipboardList} onPress={() => undefined} />
      </View>
    </Screen>
  );
}
