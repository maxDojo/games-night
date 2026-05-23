import { useEffect, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { BadgeCheck, Search, Ticket } from 'lucide-react-native';
import { router } from 'expo-router';

import { TeamCard } from '../../components/game/TeamCard';
import { Screen } from '../../components/layout/Screen';
import { ActionButton } from '../../components/ui/ActionButton';
import { InfoBanner } from '../../components/ui/InfoBanner';
import { usePartyState } from '../../state/PartyState';
import { useAppStyles } from '../../theme/useAppStyles';

export function PlayerCheckInScreen() {
  const { styles, theme } = useAppStyles();
  const {
    checkInSelectedTeam,
    isCheckingIn,
    isLoadingParty,
    joinCode,
    loadPlayerParty,
    partyName,
    partySource,
    period,
    playerError,
    playerNickname,
    selectTeam,
    selectedTeam,
    teams,
  } = usePartyState();
  const [joinCodeInput, setJoinCodeInput] = useState(partySource === 'api' ? joinCode : '');
  const [nickname, setNickname] = useState(playerNickname ?? '');
  const showTeams = partySource === 'api';

  useEffect(() => {
    if (partySource === 'api') {
      setJoinCodeInput(joinCode);
    }
  }, [joinCode, partySource]);

  useEffect(() => {
    if (playerNickname) {
      setNickname(playerNickname);
    }
  }, [playerNickname]);

  const handleFindParty = () => {
    void loadPlayerParty(joinCodeInput);
  };

  const handleCheckIn = async () => {
    const team = await checkInSelectedTeam(nickname);
    if (team) {
      router.replace('/player/answer');
    }
  };

  return (
    <Screen eyebrow={showTeams ? 'VENUE VERIFIED' : 'PLAYER CHECK-IN'} title={showTeams ? 'Choose your side' : 'Join the room'}>
      <Text style={styles.bodyText}>
        Enter the code from the host, then pick a team before it fills up. Scores stay sealed until the host reveal.
      </Text>

      <View style={styles.card}>
        <View style={styles.inputGroup}>
          <Text style={styles.metaLabelAccent}>ROOM CODE</Text>
          <TextInput
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!isLoadingParty && !isCheckingIn}
            maxLength={6}
            onChangeText={(value) => setJoinCodeInput(value.toUpperCase().replace(/[^A-Z2-9]/gu, ''))}
            placeholder="LUCKY7"
            placeholderTextColor={theme.palette.muted}
            returnKeyType="search"
            style={styles.textInput}
            value={joinCodeInput}
            onSubmitEditing={handleFindParty}
          />
        </View>
        <ActionButton
          label={isLoadingParty ? 'Finding party...' : 'Find party'}
          icon={Search}
          onPress={handleFindParty}
          disabled={isLoadingParty || isCheckingIn || joinCodeInput.length !== 6}
          primary
        />
      </View>

      {playerError ? <Text style={styles.errorText}>{playerError}</Text> : null}

      {showTeams ? (
        <>
          <InfoBanner
            icon={Ticket}
            title={partyName}
            subtitle={`Venue verified / ${period.weekLabel}`}
            color={theme.palette.info}
          />
          <View style={styles.inputGroup}>
            <Text style={styles.metaLabelAccent}>DISPLAY NAME</Text>
            <TextInput
              autoCapitalize="words"
              autoCorrect={false}
              editable={!isCheckingIn}
              maxLength={40}
              onChangeText={setNickname}
              placeholder="Your party name"
              placeholderTextColor={theme.palette.muted}
              returnKeyType="done"
              style={styles.textInput}
              value={nickname}
            />
          </View>
          <View style={styles.stack}>
            {teams.map((team) => (
              <TeamCard
                key={team.id}
                team={team}
                selected={team.id === selectedTeam?.id}
                showPoints={false}
                disabled={team.checkedIn >= team.capacity || isCheckingIn}
                onPress={() => selectTeam(team.id)}
              />
            ))}
          </View>
          <ActionButton
            label={
              isCheckingIn
                ? 'Checking in...'
                : selectedTeam
                  ? `Check in to ${selectedTeam.name}`
                  : 'Choose an open team'
            }
            icon={BadgeCheck}
            onPress={handleCheckIn}
            disabled={!selectedTeam || !nickname.trim() || isCheckingIn}
            danger
          />
        </>
      ) : null}
    </Screen>
  );
}
