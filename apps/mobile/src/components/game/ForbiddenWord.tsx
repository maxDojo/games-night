import { Text, View } from 'react-native';

import { useAppStyles } from '../../theme/useAppStyles';

export function ForbiddenWord({ label }: { label: string }) {
  const { styles } = useAppStyles();

  return (
    <View style={styles.forbiddenWord}>
      <Text style={styles.forbiddenText}>{label}</Text>
    </View>
  );
}
