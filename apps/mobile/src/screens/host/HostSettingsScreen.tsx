import { Text, View } from 'react-native';
import { Eye, MapPin, Palette, Repeat, Save, Settings, Smartphone, Users } from 'lucide-react-native';

import { Screen } from '../../components/layout/Screen';
import { ActionButton } from '../../components/ui/ActionButton';
import { InfoBanner } from '../../components/ui/InfoBanner';
import { Pill } from '../../components/ui/Badges';
import { Stat } from '../../components/ui/Stat';
import { usePartyState } from '../../state/PartyState';
import { useAppStyles } from '../../theme/useAppStyles';

export function HostSettingsScreen() {
  const { styles, theme } = useAppStyles();
  const { hostParty, hostTeams, queuedRounds } = usePartyState();
  const totalCheckedIn = hostTeams.reduce((total, team) => total + team.checkedIn, 0);
  const hasCheckIns = totalCheckedIn > 0;
  const hasStartedRounds = queuedRounds.some((round) => round.status === 'ACTIVE' || round.status === 'COMPLETED');
  const status = hostParty?.status ?? 'DRAFT';

  return (
    <Screen eyebrow="HOST SETTINGS" title={hostParty ? `${hostParty.name} settings` : 'Party settings'}>
      <InfoBanner
        icon={Settings}
        title={hostParty ? hostParty.joinCode : 'Create a party first'}
        subtitle={
          hostParty
            ? 'Settings are locked for now so tonight stays consistent.'
            : 'Create or select a party before editing settings.'
        }
        color={hostParty ? theme.palette.info : theme.palette.danger}
      />

      <View style={styles.roomCard}>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.metaLabelLight}>CURRENT PARTY</Text>
            <Text style={styles.bigCode}>{hostParty?.joinCode ?? '------'}</Text>
          </View>
          <Pill label={status} />
        </View>
        <View style={styles.statRow}>
          <Stat value={(hostParty?.maxTeams ?? 0).toString()} label="teams" />
          <Stat value={(hostParty?.maxPerTeam ?? 0).toString()} label="per team" />
          <Stat value={totalCheckedIn.toString()} label="checked in" accent={hasCheckIns} />
        </View>
      </View>

      <SettingsSection
        icon={Users}
        title="Capacity"
        detail={
          hostParty
            ? `${hostParty.maxTeams} teams / ${hostParty.maxPerTeam} players per team`
            : 'Party capacity appears here after creation.'
        }
        lockedReason={
          hasCheckIns
            ? 'Reducing capacity after check-ins requires resolving full teams first.'
            : 'Capacity changes will unlock before players check in.'
        }
      />

      <SettingsSection
        icon={Repeat}
        title="Recurring parties"
        detail="One-off party"
        lockedReason="Next Week appears only for recurring parties."
      />

      <SettingsSection
        icon={MapPin}
        title="Venue verification"
        detail="Off"
        lockedReason="Venue-only check-in will include a host override."
      />

      <SettingsSection
        icon={Smartphone}
        title="Trivia display"
        detail="Shared screen"
        lockedReason="Player-phone questions will be optional per party."
      />

      <SettingsSection
        icon={Palette}
        title="Theme"
        detail={theme.displayName}
        lockedReason="Cover photos and safe palettes will apply to this room."
      />

      <SettingsSection
        icon={Eye}
        title="Join lifecycle"
        detail={hasStartedRounds ? 'Rounds have started' : 'Lobby-safe settings'}
        lockedReason={
          hasStartedRounds
            ? 'Join and check-in settings stay locked once rounds begin.'
            : 'Join rules unlock while the party is still in setup.'
        }
      />

      <ActionButton label="Save settings" icon={Save} onPress={() => undefined} disabled primary />
    </Screen>
  );
}

interface SettingsSectionProps {
  detail: string;
  icon: typeof Users;
  lockedReason: string;
  title: string;
}

function SettingsSection({ detail, icon: Icon, lockedReason, title }: SettingsSectionProps) {
  const { styles, theme } = useAppStyles();

  return (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <View style={styles.flex}>
          <Text style={styles.metaLabelAccent}>{title.toUpperCase()}</Text>
          <Text style={styles.cardTitle}>{detail}</Text>
        </View>
        <Icon color={theme.palette.info} size={20} />
      </View>
      <Text style={styles.bodyText}>{lockedReason}</Text>
    </View>
  );
}
