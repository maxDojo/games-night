import { Text, View } from 'react-native';
import { ArrowRight, BadgeAlert, Brain, Crown, Drama, Sparkles, Users } from 'lucide-react-native';

import { joinCode } from '../data/mockState';
import { Screen } from '../components/layout/Screen';
import { ActionButton } from '../components/ui/ActionButton';
import { Pill, Token } from '../components/ui/Badges';
import { useAppStyles } from '../theme/useAppStyles';

interface WelcomeScreenProps {
  onHost: () => void;
  onPlayer: () => void;
}

export function WelcomeScreen({ onHost, onPlayer }: WelcomeScreenProps) {
  const { styles, theme } = useAppStyles();

  return (
    <Screen>
      <View style={styles.poster}>
        <View style={styles.rowBetween}>
          <Text style={styles.eyebrow}>{theme.displayName.toUpperCase()}</Text>
          <Pill label="THEMED" icon={Sparkles} />
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>{theme.displayName}</Text>
          <Text style={styles.bodyText}>
            Friday league, custom games, team chaos, and every point on the record.
          </Text>
        </View>
        <View style={styles.tokenRow}>
          <Token label="Quiz" icon={Brain} color={theme.palette.accent} />
          <Token label="Act" icon={Drama} color={theme.palette.info} />
          <Token label="Taboo" icon={BadgeAlert} color="#FF7A3D" />
        </View>
      </View>

      <View style={styles.cardCompact}>
        <View>
          <Text style={styles.metaLabel}>JOIN {theme.displayName.toUpperCase()}</Text>
          <Text style={styles.codeText}>{joinCode}</Text>
        </View>
        <ArrowRight color={theme.palette.info} size={22} />
      </View>

      <View style={styles.twoColumn}>
        <ActionButton label="Host" icon={Crown} onPress={onHost} primary />
        <ActionButton label="Player" icon={Users} onPress={onPlayer} />
      </View>
    </Screen>
  );
}
