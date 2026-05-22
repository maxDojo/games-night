import { AppShell } from './src/shell/AppShell';
import { ThemeProvider } from './src/theme/theme';

export default function App() {
  return (
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  );
}
