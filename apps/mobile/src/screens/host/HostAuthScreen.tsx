import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { LogIn, UserPlus } from 'lucide-react-native';

import { Screen } from '../../components/layout/Screen';
import { ActionButton } from '../../components/ui/ActionButton';
import { InfoBanner } from '../../components/ui/InfoBanner';
import { usePartyState } from '../../state/PartyState';
import { useAppStyles } from '../../theme/useAppStyles';

type HostAuthMode = 'login' | 'register';

export function HostAuthScreen() {
  const { styles, theme } = useAppStyles();
  const {
    hostAuthError,
    isHostAuthenticating,
    loginHostAccount,
    registerHostAccount,
  } = usePartyState();
  const [mode, setMode] = useState<HostAuthMode>('login');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const isRegistering = mode === 'register';
  const canSubmit =
    email.trim().length > 0 &&
    password.length >= (isRegistering ? 8 : 1) &&
    (!isRegistering || displayName.trim().length > 0);

  const submit = async () => {
    const ok = isRegistering
      ? await registerHostAccount(email, displayName, password)
      : await loginHostAccount(email, password);

    if (ok) {
      router.replace('/host/lobby');
    }
  };

  return (
    <Screen eyebrow="HOST ACCESS" title={isRegistering ? 'Create host' : 'Host login'}>
      <InfoBanner
        icon={isRegistering ? UserPlus : LogIn}
        title="Run the room"
        subtitle="Host accounts protect party creation, queues, scoring, and reveal controls."
        color={theme.palette.info}
      />

      <View style={styles.twoColumn}>
        <ActionButton label="Login" icon={LogIn} onPress={() => setMode('login')} primary={!isRegistering} />
        <ActionButton label="Register" icon={UserPlus} onPress={() => setMode('register')} primary={isRegistering} />
      </View>

      <View style={styles.card}>
        {isRegistering ? (
          <View style={styles.inputGroup}>
            <Text style={styles.metaLabelAccent}>DISPLAY NAME</Text>
            <TextInput
              autoCapitalize="words"
              autoCorrect={false}
              editable={!isHostAuthenticating}
              maxLength={80}
              onChangeText={setDisplayName}
              placeholder="Greg"
              placeholderTextColor={theme.palette.muted}
              style={styles.textInput}
              value={displayName}
            />
          </View>
        ) : null}

        <View style={styles.inputGroup}>
          <Text style={styles.metaLabelAccent}>EMAIL</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isHostAuthenticating}
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="host@example.com"
            placeholderTextColor={theme.palette.muted}
            style={styles.textInput}
            value={email}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.metaLabelAccent}>PASSWORD</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isHostAuthenticating}
            onChangeText={setPassword}
            placeholder={isRegistering ? '8+ characters' : 'Password'}
            placeholderTextColor={theme.palette.muted}
            secureTextEntry
            style={styles.textInput}
            value={password}
          />
        </View>
      </View>

      {hostAuthError ? <Text style={styles.errorText}>{hostAuthError}</Text> : null}

      <ActionButton
        label={isHostAuthenticating ? 'Signing in...' : isRegistering ? 'Create host' : 'Login'}
        icon={isRegistering ? UserPlus : LogIn}
        onPress={submit}
        disabled={!canSubmit || isHostAuthenticating}
        danger
      />
    </Screen>
  );
}
