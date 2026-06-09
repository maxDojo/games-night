import { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react';

export type ThemeName = 'arcade' | 'luminous';

export interface ThemeProfile {
  name: ThemeName;
  displayName: string;
  coverImageUrl?: string;
  avatarUrl?: string;
  accentColor?: string;
  palette: ThemePalette;
  shape: ThemeShape;
  opacity: ThemeOpacity;
  effect: ThemeEffect;
}

export interface ThemePalette {
  background: string;
  ink: string;
  surface: string;
  surfaceAlt: string;
  foreground: string;
  muted: string;
  line: string;
  accent: string;
  accentAlt: string;
  action: string;
  danger: string;
  success: string;
  info: string;
  warning: string;
  overlay: string;
  overlayStrong: string;
  onAccent: string;
  onAction: string;
  onInfo: string;
  onDanger: string;
  nav: string;
  navActive: string;
  input: string;
  subtleText: string;
}

export interface ThemeShape {
  cardRadius: number;
  controlRadius: number;
  pillRadius: number;
}

export interface ThemeOpacity {
  disabled: number;
  scrim: string;
}

export interface ThemeEffect {
  shadowColor: string;
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
  accentShadowColor: string;
  accentShadowOpacity: number;
  accentShadowRadius: number;
  accentElevation: number;
}

export const arcadeTheme: ThemeProfile = {
  name: 'arcade',
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
    action: '#FFCB45',
    danger: '#FF4FA3',
    success: '#91F25C',
    info: '#3DF5D8',
    warning: '#FF7A3D',
    overlay: '#0D0A19AA',
    overlayStrong: '#0D0A19DD',
    onAccent: '#0D0A19',
    onAction: '#0D0A19',
    onInfo: '#173D38',
    onDanger: '#FFF7D6',
    nav: '#17123A',
    navActive: '#FFCB45',
    input: '#100D2B',
    subtleText: '#FFE4F2',
  },
  shape: {
    cardRadius: 8,
    controlRadius: 8,
    pillRadius: 8,
  },
  opacity: {
    disabled: 0.55,
    scrim: '#0D0A19AA',
  },
  effect: {
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
    accentShadowColor: '#FFCB45',
    accentShadowOpacity: 0.18,
    accentShadowRadius: 10,
    accentElevation: 4,
  },
};

export const luminousTheme: ThemeProfile = {
  name: 'luminous',
  displayName: 'Luminous',
  accentColor: '#1EDDD2',
  palette: {
    background: '#180B2E',
    ink: '#090312',
    surface: '#291640',
    surfaceAlt: '#3A2059',
    foreground: '#FFF7F0',
    muted: '#D0B9DB',
    line: '#704C82',
    accent: '#1EDDD2',
    accentAlt: '#FF7A73',
    action: '#FF5D86',
    danger: '#A9083E',
    success: '#25D7A2',
    info: '#9B82FF',
    warning: '#FFB44A',
    overlay: '#160A2AC2',
    overlayStrong: '#090312E8',
    onAccent: '#071D21',
    onAction: '#FFF8F2',
    onInfo: '#FFF8F2',
    onDanger: '#FFF8F2',
    nav: '#211037',
    navActive: '#1EDDD2',
    input: '#211035',
    subtleText: '#FFD0C8',
  },
  shape: {
    cardRadius: 18,
    controlRadius: 16,
    pillRadius: 999,
  },
  opacity: {
    disabled: 0.5,
    scrim: '#160A2AC2',
  },
  effect: {
    shadowColor: '#05020C',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 5,
    accentShadowColor: '#1EDDD2',
    accentShadowOpacity: 0.32,
    accentShadowRadius: 18,
    accentElevation: 7,
  },
};

export const themeRegistry = {
  arcade: arcadeTheme,
  luminous: luminousTheme,
} satisfies Record<ThemeName, ThemeProfile>;

export const defaultThemeName: ThemeName = 'luminous';
export const gregHouseTheme = arcadeTheme;

interface ThemeController {
  themeName: ThemeName;
  theme: ThemeProfile;
  setThemeName: (themeName: ThemeName) => void;
}

const defaultThemeController: ThemeController = {
  themeName: defaultThemeName,
  theme: themeRegistry[defaultThemeName],
  setThemeName: () => undefined,
};

const ThemeContext = createContext<ThemeController>(defaultThemeController);

interface ThemeProviderProps extends PropsWithChildren {
  initialThemeName?: ThemeName;
}

export function ThemeProvider({ children, initialThemeName = defaultThemeName }: ThemeProviderProps) {
  const [themeName, setThemeName] = useState<ThemeName>(initialThemeName);
  const value = useMemo(
    () => ({
      themeName,
      theme: themeRegistry[themeName],
      setThemeName,
    }),
    [themeName],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeProfile() {
  return useContext(ThemeContext).theme;
}

export function useThemeController() {
  return useContext(ThemeContext);
}
