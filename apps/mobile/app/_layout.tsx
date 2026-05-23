import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { PartyStateProvider } from '../src/state/PartyState';
import { ThemeProvider } from '../src/theme/theme';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <PartyStateProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }} />
      </PartyStateProvider>
    </ThemeProvider>
  );
}
