import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { Brain, Crown, Drama, Search, Sparkles, Trophy } from 'lucide-react-native';

import { Screen } from '../components/layout/Screen';
import { GradientPanel } from '../components/ui/GradientPanel';
import { ActionButton } from '../components/ui/ActionButton';
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
    <Screen immersive>
      <View style={styles.welcomeBrand}>
        <Sparkles color={theme.palette.accent} size={24} />
        <Text style={styles.welcomeBrandTitle}>
          GAMES <Text style={styles.welcomeBrandAccent}>NIGHT</Text>
        </Text>
        <Text style={styles.centeredBodyText}>The room is live. Enter the code from your host.</Text>
      </View>

      <GradientPanel
        colors={[theme.palette.surfaceAlt, '#3D203D', theme.palette.surface]}
        style={[styles.gradientPanel, styles.roomEntryCard]}
      >
        <Text style={styles.gradientPanelMeta}>JOIN THE ROOM</Text>
        <Text style={styles.gradientPanelTitle}>Enter party code</Text>
        <View style={styles.codeSlots}>
          {Array.from({ length: 6 }, (_, index) => (
            <View
              key={index}
              style={[styles.codeSlot, normalizedJoinCode[index] && styles.codeSlotFilled]}
            >
              <Text style={styles.codeSlotText}>{normalizedJoinCode[index] ?? ''}</Text>
            </View>
          ))}
        </View>
        <View style={styles.inputGroup}>
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
      </GradientPanel>

      <View style={styles.featureStrip}>
        <View style={styles.featureTile}>
          <Brain color={theme.palette.warning} size={20} />
          <Text style={styles.featureTileText}>Trivia</Text>
        </View>
        <View style={styles.featureTile}>
          <Drama color={theme.palette.info} size={20} />
          <Text style={styles.featureTileText}>Party games</Text>
        </View>
        <View style={styles.featureTile}>
          <Trophy color={theme.palette.accent} size={20} />
          <Text style={styles.featureTileText}>Big reveal</Text>
        </View>
      </View>

      <ActionButton label="Enter as host" icon={Crown} onPress={onHost} />
    </Screen>
  );
}
