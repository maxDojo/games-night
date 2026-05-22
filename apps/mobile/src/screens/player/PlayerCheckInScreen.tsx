import { Text, View } from 'react-native';
import { BadgeCheck, Ticket } from 'lucide-react-native';

import { TeamCard } from '../../components/game/TeamCard';
import { Screen } from '../../components/layout/Screen';
import { ActionButton } from '../../components/ui/ActionButton';
import { InfoBanner } from '../../components/ui/InfoBanner';
import { period, teams } from '../../data/mockState';
import { useAppStyles } from '../../theme/useAppStyles';

export function PlayerCheckInScreen() {
  const { styles, theme } = useAppStyles();

  return (
    <Screen eyebrow="VENUE VERIFIED" title="Choose your side">
      <Text style={styles.bodyText}>
        You are inside the venue radius. Pick a team before it fills up.
      </Text>
      <InfoBanner
        icon={Ticket}
        title={period.name}
        subtitle={`Venue verified / ${period.weekLabel}`}
        color={theme.palette.info}
      />
      <View style={styles.stack}>
        {teams.map((team) => (
          <TeamCard key={team.id} team={team} selected={team.isSelected} />
        ))}
      </View>
      <ActionButton label="Check in to Neon Noodles" icon={BadgeCheck} onPress={() => undefined} danger />
    </Screen>
  );
}
