import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { WelcomeScreen } from '../src/screens/WelcomeScreen';
import { useAppStyles } from '../src/theme/useAppStyles';

export default function HomeRoute() {
  const { styles } = useAppStyles();

  const enterPlayer = () => {
    router.push('/player/check-in');
  };

  const enterHost = () => {
    router.push('/host/lobby');
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <WelcomeScreen onHost={enterHost} onPlayer={enterPlayer} />
    </SafeAreaView>
  );
}
