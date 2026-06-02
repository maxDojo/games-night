import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { BadgeAlert, Brain, Crown, Drama, Search } from 'lucide-react-native';

import { Screen } from '../components/layout/Screen';
import { ActionButton } from '../components/ui/ActionButton';
import { Token } from '../components/ui/Badges';
import { useAppStyles } from '../theme/useAppStyles';

interface WelcomeScreenProps {
  onHost: () => void;
  onPlayer: (joinCode: string) => void;
}

export function WelcomeScreen({ onHost, onPlayer }: WelcomeScreenProps) {
  const { styles, theme } = useAppStyles();
  const [joinCode, setJoinCode] = useState('');
  const normalizedJoinCode = joinCode.trim().toUpperCase();

  return (
    <Screen>
      <View style={styles.poster}>
        <View style={styles.heroCopy}>
          <Text style={styles.eyebrow}>GAMES NIGHT</Text>
          <Text style={styles.heroTitle}>Join the room</Text>
          <Text style={styles.bodyText}>
            Enter the host code, pick your team, and keep the scores sealed until the reveal.
          </Text>
        </View>
        <View style={styles.tokenRow}>
          <Token label="Quiz" icon={Brain} color={theme.palette.accent} />
          <Token label="Act" icon={Drama} color={theme.palette.info} />
          <Token label="Taboo" icon={BadgeAlert} color={theme.palette.warning} />
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.inputGroup}>
          <Text style={styles.metaLabelAccent}>ROOM CODE</Text>
          <TextInput
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={6}
            onChangeText={(value) => setJoinCode(value.toUpperCase().replace(/[^A-Z2-9]/gu, ''))}
            onSubmitEditing={() => normalizedJoinCode.length === 6 && onPlayer(normalizedJoinCode)}
            placeholder="LUCKY7"
            placeholderTextColor={theme.palette.muted}
            returnKeyType="join"
            style={styles.textInput}
            value={joinCode}
          />
        </View>
        <ActionButton
          label="Join party"
          icon={Search}
          onPress={() => onPlayer(normalizedJoinCode)}
          disabled={normalizedJoinCode.length !== 6}
          primary
        />
      </View>

      <ActionButton label="Host login" icon={Crown} onPress={onHost} />
    </Screen>
  );
}
