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
  danger: string;
  success: string;
  info: string;
  warning: string;
  overlay: string;
  overlayStrong: string;
  onAccent: string;
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
    danger: '#FF4FA3',
    success: '#91F25C',
    info: '#3DF5D8',
    warning: '#FF7A3D',
    overlay: '#0D0A19AA',
    overlayStrong: '#0D0A19DD',
    onAccent: '#0D0A19',
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
};

export const luminousTheme: ThemeProfile = {
  name: 'luminous',
  displayName: 'Luminous',
  accentColor: '#00E6D2',
  palette: {
    background: '#17082F',
    ink: '#090413',
    surface: '#241040',
    surfaceAlt: '#32165F',
    foreground: '#FFF8F2',
    muted: '#C9B8E6',
    line: '#5C3C91',
    accent: '#00E6D2',
    accentAlt: '#FF6B9F',
    danger: '#FF4D7D',
    success: '#36F2A4',
    info: '#56B6FF',
    warning: '#FF9E57',
    overlay: '#120724B8',
    overlayStrong: '#090413DD',
    onAccent: '#071D21',
    onInfo: '#081728',
    onDanger: '#FFF8F2',
    nav: '#1D0C36',
    navActive: '#00E6D2',
    input: '#130724',
    subtleText: '#F6C5DE',
  },
  shape: {
    cardRadius: 18,
    controlRadius: 16,
    pillRadius: 999,
  },
  opacity: {
    disabled: 0.5,
    scrim: '#120724B8',
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
