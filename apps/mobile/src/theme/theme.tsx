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
  accentColor: '#05D7C1',
  palette: {
    background: '#170B25',
    ink: '#100818',
    surface: '#251630',
    surfaceAlt: '#36243E',
    foreground: '#F8EAE2',
    muted: '#BCA8C2',
    line: '#553249',
    accent: '#05D7C1',
    accentAlt: '#FD5B46',
    action: '#FD5462',
    danger: '#89010F',
    success: '#10A195',
    info: '#9A73D9',
    warning: '#FD7A10',
    overlay: '#170B25CC',
    overlayStrong: '#100818EB',
    onAccent: '#071D21',
    onAction: '#FFF7F0',
    onInfo: '#FFF7F0',
    onDanger: '#FFF7F0',
    nav: '#1A1129',
    navActive: '#05D7C1',
    input: '#1F142B',
    subtleText: '#FEB37C',
  },
  shape: {
    cardRadius: 18,
    controlRadius: 16,
    pillRadius: 999,
  },
  opacity: {
    disabled: 0.5,
    scrim: '#170B25CC',
  },
  effect: {
    shadowColor: '#05020C',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 5,
    accentShadowColor: '#05D7C1',
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
