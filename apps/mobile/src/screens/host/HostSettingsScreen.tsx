import { useEffect, useMemo, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { Eye, MapPin, Palette, Repeat, Save, Settings, Smartphone, Users } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import { Screen } from '../../components/layout/Screen';
import { ActionButton } from '../../components/ui/ActionButton';
import { InfoBanner } from '../../components/ui/InfoBanner';
import { Pill } from '../../components/ui/Badges';
import { Stat } from '../../components/ui/Stat';
import { usePartyState } from '../../state/PartyState';
import { useAppStyles } from '../../theme/useAppStyles';

export function HostSettingsScreen() {
  const { styles, theme } = useAppStyles();
  const {
    hostParty,
    hostSettingsError,
    hostSettingsMessage,
    hostTeams,
    isUpdatingHostSettings,
    queuedRounds,
    updateHostPartySettings,
  } = usePartyState();
  const [partyName, setPartyName] = useState(hostParty?.name ?? '');
  const [maxTeams, setMaxTeams] = useState(hostParty?.maxTeams.toString() ?? '4');
  const [maxPerTeam, setMaxPerTeam] = useState(hostParty?.maxPerTeam.toString() ?? '8');
  const totalCheckedIn = hostTeams.reduce((total, team) => total + team.checkedIn, 0);
  const hasCheckIns = totalCheckedIn > 0;
  const hasStartedRounds = queuedRounds.some((round) => round.status === 'ACTIVE' || round.status === 'COMPLETED');
  const status = hostParty?.status ?? 'DRAFT';
  const maxTeamsNumber = Number(maxTeams);
  const maxPerTeamNumber = Number(maxPerTeam);
  const capacityEditable = hostParty?.status === 'LOBBY';
  const nameChanged = Boolean(hostParty && partyName.trim() !== hostParty.name);
  const maxTeamsChanged = Boolean(hostParty && maxTeamsNumber !== hostParty.maxTeams);
  const maxPerTeamChanged = Boolean(hostParty && maxPerTeamNumber !== hostParty.maxPerTeam);
  const hasChanges = nameChanged || maxTeamsChanged || maxPerTeamChanged;
  const invalid =
    !partyName.trim() ||
    Number.isNaN(maxTeamsNumber) ||
    Number.isNaN(maxPerTeamNumber) ||
    maxTeamsNumber < 2 ||
    maxTeamsNumber > 8 ||
    maxPerTeamNumber < 1 ||
    maxPerTeamNumber > 10;
  const capacityLockReason = useMemo(() => {
    if (!hostParty) {
      return 'Create a party before editing capacity.';
    }

    if (!capacityEditable) {
      return 'Capacity locks once the party leaves setup.';
    }

    if (hasCheckIns) {
      return 'Reducing capacity after check-ins may be rejected if teams are already full.';
    }

    return 'Capacity changes apply while the party is still in setup.';
  }, [capacityEditable, hasCheckIns, hostParty]);

  useEffect(() => {
    if (!hostParty) {
      return;
    }

    setPartyName(hostParty.name);
    setMaxTeams(hostParty.maxTeams.toString());
    setMaxPerTeam(hostParty.maxPerTeam.toString());
  }, [hostParty]);

  const handleSave = async () => {
    if (!hostParty || invalid || !hasChanges) {
      return;
    }

    await updateHostPartySettings({
      ...(nameChanged ? { name: partyName.trim() } : {}),
      ...(maxTeamsChanged ? { maxTeams: maxTeamsNumber } : {}),
      ...(maxPerTeamChanged ? { maxPerTeam: maxPerTeamNumber } : {}),
    });
  };

  return (
    <Screen eyebrow="HOST SETTINGS" title={hostParty ? `${hostParty.name} settings` : 'Party settings'}>
      <InfoBanner
        icon={Settings}
        title={hostParty ? hostParty.joinCode : 'Create a party first'}
        subtitle={
          hostParty
            ? 'Edit setup-safe settings here. Mid-night controls stay locked.'
            : 'Create or select a party before editing settings.'
        }
        color={hostParty ? theme.palette.info : theme.palette.danger}
      />

      <View style={[styles.roomCard, styles.roomCardSpotlight]}>
        <View style={styles.glowStrip} />
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

      <View style={[styles.card, styles.cardLuminous]}>
        <View style={styles.rowBetween}>
          <Text style={styles.metaLabelAccent}>PARTY DETAILS</Text>
          <Settings color={theme.palette.info} size={18} />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.metaLabelAccent}>PARTY NAME</Text>
          <TextInput
            autoCapitalize="words"
            autoCorrect={false}
            editable={Boolean(hostParty) && !isUpdatingHostSettings}
            maxLength={80}
            onChangeText={setPartyName}
            placeholder="Games Night"
            placeholderTextColor={theme.palette.muted}
            style={styles.textInput}
            value={partyName}
          />
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.metaLabelAccent}>CAPACITY</Text>
          <Users color={theme.palette.info} size={18} />
        </View>
        <View style={styles.twoColumn}>
          <View style={[styles.inputGroup, styles.flex]}>
            <Text style={styles.metaLabelAccent}>TEAMS</Text>
            <TextInput
              editable={Boolean(hostParty) && capacityEditable && !isUpdatingHostSettings}
              keyboardType="number-pad"
              maxLength={1}
              onChangeText={(value) => setMaxTeams(value.replace(/[^2-8]/gu, '').slice(0, 1))}
              placeholder="4"
              placeholderTextColor={theme.palette.muted}
              style={styles.textInput}
              value={maxTeams}
            />
          </View>
          <View style={[styles.inputGroup, styles.flex]}>
            <Text style={styles.metaLabelAccent}>PER TEAM</Text>
            <TextInput
              editable={Boolean(hostParty) && capacityEditable && !isUpdatingHostSettings}
              keyboardType="number-pad"
              maxLength={2}
              onChangeText={(value) => setMaxPerTeam(value.replace(/\D/gu, '').slice(0, 2))}
              placeholder="8"
              placeholderTextColor={theme.palette.muted}
              style={styles.textInput}
              value={maxPerTeam}
            />
          </View>
        </View>
        <Text style={styles.bodyText}>{capacityLockReason}</Text>
      </View>

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

      {hostSettingsError ? <Text style={styles.errorText}>{hostSettingsError}</Text> : null}
      {hostSettingsMessage ? <Text style={styles.positiveText}>{hostSettingsMessage}</Text> : null}
      <ActionButton
        label={isUpdatingHostSettings ? 'Saving...' : 'Save settings'}
        icon={Save}
        onPress={handleSave}
        disabled={!hostParty || !hasChanges || invalid || isUpdatingHostSettings}
        primary
      />
    </Screen>
  );
}

interface SettingsSectionProps {
  detail: string;
  icon: LucideIcon;
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
