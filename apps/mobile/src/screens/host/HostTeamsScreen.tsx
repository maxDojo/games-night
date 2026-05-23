import { Text, View } from 'react-native';
import { Plus, Shuffle, Users } from 'lucide-react-native';

import { TeamCard } from '../../components/game/TeamCard';
import { Screen } from '../../components/layout/Screen';
import { ActionButton } from '../../components/ui/ActionButton';
import { InfoBanner } from '../../components/ui/InfoBanner';
import { usePartyState } from '../../state/PartyState';
import { useAppStyles } from '../../theme/useAppStyles';

export function HostTeamsScreen() {
  const { styles, theme } = useAppStyles();
  const { checkedInTeam, period, teams } = usePartyState();

  return (
    <Screen eyebrow="TEAM SEASON" title={`${theme.displayName} teams`}>
      <Text style={styles.bodyText}>
        Capacity limits keep teams fair. Players check in without profiles.
      </Text>
      <InfoBanner
        icon={Users}
        title={period.name}
        subtitle={`Leaderboard aggregates linked parties. Capacity: ${period.capacityLabel}`}
        color={theme.palette.success}
      />
      <View style={styles.stack}>
        {teams.map((team) => (
          <TeamCard key={team.id} team={team} selected={team.id === checkedInTeam?.id} />
        ))}
      </View>
      <View style={styles.twoColumn}>
        <ActionButton label="Team" icon={Plus} onPress={() => undefined} primary />
        <ActionButton label="Move" icon={Shuffle} onPress={() => undefined} />
      </View>
    </Screen>
  );
}
