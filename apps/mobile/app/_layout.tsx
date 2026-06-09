import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  Baloo2_600SemiBold,
  Baloo2_700Bold,
  Baloo2_800ExtraBold,
  useFonts as useBalooFonts,
} from '@expo-google-fonts/baloo-2';
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';

import { PartyStateProvider } from '../src/state/PartyState';
import { ThemeProvider } from '../src/theme/theme';

export default function RootLayout() {
  const [fontsLoaded] = useBalooFonts({
    Baloo2_600SemiBold,
    Baloo2_700Bold,
    Baloo2_800ExtraBold,
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ThemeProvider>
      <PartyStateProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }} />
      </PartyStateProvider>
    </ThemeProvider>
  );
}
