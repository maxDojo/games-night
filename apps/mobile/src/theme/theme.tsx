import { createContext, useContext, type PropsWithChildren } from 'react';

export interface ThemeProfile {
  displayName: string;
  coverImageUrl?: string;
  avatarUrl?: string;
  accentColor?: string;
  palette: {
    background: string;
    ink: string;
    surface: string;
    surfaceAlt: string;
    foreground: string;
    muted: string;
    line: string;
    accent: string;
    accentAlt: string;
    danger: string;
    success: string;
    info: string;
  };
}

export const gregHouseTheme: ThemeProfile = {
  displayName: "Greg's House",
  accentColor: '#FFCB45',
  palette: {
    background: '#100D2B',
    ink: '#0D0A19',
    surface: '#241B52',
    surfaceAlt: '#32266C',
    foreground: '#FFF7D6',
    muted: '#B7B0D8',
    line: '#4A3C8C',
    accent: '#FFCB45',
    accentAlt: '#FF4FA3',
    danger: '#FF4FA3',
    success: '#91F25C',
    info: '#3DF5D8',
  },
};

const ThemeContext = createContext<ThemeProfile>(gregHouseTheme);

export function ThemeProvider({ children }: PropsWithChildren) {
  return <ThemeContext.Provider value={gregHouseTheme}>{children}</ThemeContext.Provider>;
}

export function useThemeProfile() {
  return useContext(ThemeContext);
}
