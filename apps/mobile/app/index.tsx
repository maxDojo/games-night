import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { joinCode, teams } from '../src/data/mockState';
import { WelcomeScreen } from '../src/screens/WelcomeScreen';
import { saveSession } from '../src/storage/sessionStore';
import { useAppStyles } from '../src/theme/useAppStyles';

export default function HomeRoute() {
  const { styles } = useAppStyles();

  const enterPlayer = () => {
    void saveSession({ joinCode, teamId: teams[0]?.id });
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
