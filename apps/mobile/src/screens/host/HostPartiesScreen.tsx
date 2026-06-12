import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Plus, RefreshCw, Sparkles } from 'lucide-react-native';
import { Text, TextInput, View } from 'react-native';

import { HostPartyCard } from '../../components/host/HostPartyCard';
import { Screen } from '../../components/layout/Screen';
import { ActionButton } from '../../components/ui/ActionButton';
import { usePartyState } from '../../state/PartyState';
import { useAppStyles } from '../../theme/useAppStyles';

export function HostPartiesScreen() {
  const { styles, theme } = useAppStyles();
  const {
    createHostParty,
    hostParties,
    hostPartyError,
    hostPartyListError,
    hostUser,
    isCreatingHostParty,
    isLoadingHostParties,
    isSwitchingHostParty,
    refreshHostParties,
    selectCurrentHostParty,
  } = usePartyState();
  const [showCreate, setShowCreate] = useState(false);
  const [partyName, setPartyName] = useState('Friday Games Night');
  const [maxTeams, setMaxTeams] = useState('4');
  const [maxPerTeam, setMaxPerTeam] = useState('8');
  const activeParties = hostParties.filter(
    (party) => party.status !== 'FINISHED' && party.status !== 'CANCELLED',
  );
  const history = hostParties.filter(
    (party) => party.status === 'FINISHED' || party.status === 'CANCELLED',
  );
  const canCreate =
    partyName.trim().length > 0 &&
    Number(maxTeams) >= 2 &&
    Number(maxTeams) <= 8 &&
    Number(maxPerTeam) >= 1 &&
    Number(maxPerTeam) <= 10;

  useEffect(() => {
    void refreshHostParties();
  }, [refreshHostParties]);

  const handleCreate = async () => {
    const created = await createHostParty(partyName, Number(maxTeams), Number(maxPerTeam));
    if (created) {
      router.push('/host/lobby');
    }
  };

  const handleSelect = async (nextJoinCode: string) => {
    const selected = await selectCurrentHostParty(nextJoinCode);
    if (selected) {
      router.push('/host/lobby');
    }
  };

  return (
    <Screen avatarLabel={hostUser?.displayName} immersive>
      <View style={styles.screenTitleBlock}>
        <Text style={styles.eyebrow}>HOST ROOMS</Text>
        <Text style={styles.screenTitle}>Choose the night</Text>
        <Text style={styles.screenSubtitle}>
          Resume the current room, switch to another active party, or create a separate night.
        </Text>
      </View>

      <View style={styles.twoColumn}>
        <ActionButton
          disabled={isCreatingHostParty || isSwitchingHostParty}
          icon={Plus}
          label={showCreate ? 'Close setup' : 'New party'}
          onPress={() => setShowCreate((visible) => !visible)}
          primary={!showCreate}
        />
        <ActionButton
          disabled={isLoadingHostParties}
          icon={RefreshCw}
          label={isLoadingHostParties ? 'Loading...' : 'Refresh'}
          onPress={() => void refreshHostParties()}
        />
      </View>

      {showCreate || (!isLoadingHostParties && hostParties.length === 0) ? (
        <View style={[styles.spotlightPanel, styles.spotlightPanelAccent]}>
          <View style={styles.rowBetween}>
            <View style={styles.partyCardCopy}>
              <Text style={styles.metaLabelAccent}>NEW PARTY</Text>
              <Text style={styles.cardTitle}>Open a fresh room</Text>
            </View>
            <Sparkles color={theme.palette.accent} size={24} />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.metaLabelAccent}>PARTY NAME</Text>
            <TextInput
              autoCapitalize="words"
              autoCorrect={false}
              editable={!isCreatingHostParty}
              maxLength={80}
              onChangeText={setPartyName}
              placeholder="Friday Games Night"
              placeholderTextColor={theme.palette.muted}
              style={styles.textInput}
              value={partyName}
            />
          </View>
          <View style={styles.twoColumn}>
            <View style={[styles.inputGroup, styles.flex]}>
              <Text style={styles.metaLabelAccent}>TEAMS</Text>
              <TextInput
                editable={!isCreatingHostParty}
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
                editable={!isCreatingHostParty}
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
          <ActionButton
            disabled={!canCreate || isCreatingHostParty}
            icon={Plus}
            label={isCreatingHostParty ? 'Creating...' : 'Create and make current'}
            onPress={() => void handleCreate()}
            primary
          />
        </View>
      ) : null}

      {hostPartyError || hostPartyListError ? (
        <Text style={styles.errorText}>{hostPartyError ?? hostPartyListError}</Text>
      ) : null}

      {activeParties.length > 0 ? (
        <>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Active parties</Text>
            <Text style={styles.positiveText}>{activeParties.length}</Text>
          </View>
          {activeParties.map((party) => (
            <HostPartyCard
              disabled={isSwitchingHostParty}
              key={party.id}
              onOpen={() => router.push('/host/lobby')}
              onSelect={() => void handleSelect(party.joinCode)}
              party={party}
            />
          ))}
        </>
      ) : null}

      {history.length > 0 ? (
        <>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>History</Text>
            <Text style={styles.bodyText}>{history.length} saved</Text>
          </View>
          {history.map((party) => (
            <HostPartyCard
              key={party.id}
              onOpen={() => undefined}
              onSelect={() => undefined}
              party={party}
            />
          ))}
        </>
      ) : null}
    </Screen>
  );
}
