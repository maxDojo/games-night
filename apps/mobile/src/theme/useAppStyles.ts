import { useMemo } from 'react';

import { createStyles } from './styles';
import { useThemeProfile } from './theme';

export function useAppStyles() {
  const theme = useThemeProfile();
  const styles = useMemo(() => createStyles(theme.palette), [theme.palette]);

  return { styles, theme };
}
