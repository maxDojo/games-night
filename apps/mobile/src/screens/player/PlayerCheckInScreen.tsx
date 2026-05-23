import { Text, View } from 'react-native';
import { BadgeCheck, Ticket } from 'lucide-react-native';
import { router } from 'expo-router';

import { TeamCard } from '../../components/game/TeamCard';
import { Screen } from '../../components/layout/Screen';
import { ActionButton } from '../../components/ui/ActionButton';
import { InfoBanner } from '../../components/ui/InfoBanner';
import { usePartyState } from '../../state/PartyState';
import { useAppStyles } from '../../theme/useAppStyles';

export function PlayerCheckInScreen() {
  const { styles, theme } = useAppStyles();
  const { checkInSelectedTeam, period, selectTeam, selectedTeam, teams } = usePartyState();

  const handleCheckIn = () => {
    const team = checkInSelectedTeam();
    if (team) {
      router.replace('/player/answer');
    }
  };

  return (
    <Screen eyebrow="VENUE VERIFIED" title="Choose your side">
      <Text style={styles.bodyText}>
        You are inside the venue radius. Pick a team before it fills up. Scores stay sealed until the host reveal.
      </Text>
      <InfoBanner
        icon={Ticket}
        title={period.name}
        subtitle={`Venue verified / ${period.weekLabel}`}
        color={theme.palette.info}
      />
      <View style={styles.stack}>
        {teams.map((team) => (
          <TeamCard
            key={team.id}
            team={team}
            selected={team.id === selectedTeam?.id}
            showPoints={false}
            disabled={team.checkedIn >= team.capacity}
            onPress={() => selectTeam(team.id)}
          />
        ))}
      </View>
      <ActionButton
        label={selectedTeam ? `Check in to ${selectedTeam.name}` : 'Choose an open team'}
        icon={BadgeCheck}
        onPress={handleCheckIn}
        disabled={!selectedTeam}
        danger
      />
    </Screen>
  );
}
