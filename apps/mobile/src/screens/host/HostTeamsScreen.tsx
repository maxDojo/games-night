import { useEffect, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { Plus, RefreshCw, Shuffle, Users } from 'lucide-react-native';

import { TeamCard } from '../../components/game/TeamCard';
import { Screen } from '../../components/layout/Screen';
import { AnimatedPressable } from '../../components/motion';
import { ActionButton } from '../../components/ui/ActionButton';
import { InfoBanner } from '../../components/ui/InfoBanner';
import { usePartyState } from '../../state/PartyState';
import { useAppStyles } from '../../theme/useAppStyles';

export function HostTeamsScreen() {
  const { styles, theme } = useAppStyles();
  const {
    createHostTeam,
    hostParty,
    hostTeamError,
    hostTeams,
    isCreatingHostTeam,
    isLoadingHostTeams,
    refreshHostTeams,
    selectHostTeam,
    selectedHostTeamId,
  } = usePartyState();
  const [teamName, setTeamName] = useState('');
  const [teamColor, setTeamColor] = useState(teamColors[0]!);
  const teamLimitReached = Boolean(hostParty && hostTeams.length >= hostParty.maxTeams);
  const totalCheckedIn = hostTeams.reduce((total, team) => total + team.checkedIn, 0);

  useEffect(() => {
    void refreshHostTeams();
  }, [refreshHostTeams]);

  const handleCreateTeam = async () => {
    const ok = await createHostTeam(teamName, teamColor);
    if (ok) {
      setTeamName('');
    }
  };

  return (
    <Screen eyebrow="TEAM SETUP" title={hostParty ? `${hostParty.name} teams` : `${theme.displayName} teams`}>
      <Text style={styles.bodyText}>
        Capacity limits keep teams fair. Players check in without profiles.
      </Text>
      <InfoBanner
        icon={Users}
        title={hostParty ? hostParty.joinCode : 'Create a party first'}
        subtitle={
          hostParty
            ? `${hostTeams.length}/${hostParty.maxTeams} teams / ${totalCheckedIn} checked in / ${hostParty.maxPerTeam} per team`
            : 'Party creation lives in the host lobby. Team setup unlocks after that.'
        }
        color={hostParty ? theme.palette.success : theme.palette.info}
      />
      {hostParty ? (
        <View style={styles.card}>
          <View style={styles.inputGroup}>
            <Text style={styles.metaLabelAccent}>TEAM NAME</Text>
            <TextInput
              autoCapitalize="words"
              autoCorrect={false}
              editable={!isCreatingHostTeam && !teamLimitReached}
              maxLength={40}
              onChangeText={setTeamName}
              placeholder="Neon Noodles"
              placeholderTextColor={theme.palette.muted}
              style={styles.textInput}
              value={teamName}
            />
          </View>
          <View style={styles.threeColumn}>
            {teamColors.slice(0, 3).map((color) => (
              <AnimatedPressable
                key={color}
                disabled={isCreatingHostTeam || teamLimitReached}
                onPress={() => setTeamColor(color)}
                style={[
                  styles.smallButton,
                  { backgroundColor: color, borderWidth: teamColor === color ? 3 : 0, borderColor: theme.palette.foreground },
                ]}
              />
            ))}
          </View>
          <View style={styles.threeColumn}>
            {teamColors.slice(3).map((color) => (
              <AnimatedPressable
                key={color}
                disabled={isCreatingHostTeam || teamLimitReached}
                onPress={() => setTeamColor(color)}
                style={[
                  styles.smallButton,
                  { backgroundColor: color, borderWidth: teamColor === color ? 3 : 0, borderColor: theme.palette.foreground },
                ]}
              />
            ))}
          </View>
        </View>
      ) : null}
      {hostTeamError ? <Text style={styles.errorText}>{hostTeamError}</Text> : null}
      <View style={styles.stack}>
        {hostTeams.map((team) => (
          <TeamCard
            key={team.id}
            team={team}
            selected={team.id === selectedHostTeamId}
            showPoints={false}
            onPress={() => selectHostTeam(team.id)}
          />
        ))}
      </View>
      <View style={styles.twoColumn}>
        <ActionButton
          label={isCreatingHostTeam ? 'Adding...' : teamLimitReached ? 'Limit hit' : 'Team'}
          icon={Plus}
          onPress={handleCreateTeam}
          disabled={!hostParty || !teamName.trim() || isCreatingHostTeam || teamLimitReached}
          primary
        />
        <ActionButton
          label={isLoadingHostTeams ? 'Refreshing...' : 'Refresh'}
          icon={RefreshCw}
          onPress={() => void refreshHostTeams()}
          disabled={!hostParty || isLoadingHostTeams}
        />
      </View>
      <View style={styles.twoColumn}>
        <ActionButton label="Move" icon={Shuffle} onPress={() => undefined} disabled />
        <ActionButton label="Override" icon={Users} onPress={() => undefined} disabled />
      </View>
    </Screen>
  );
}

const teamColors = ['#FFCB45', '#FF4FA3', '#3DF5D8', '#65B8FF', '#FF7A3D', '#8B6DFF'];
