import { useEffect, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { BadgeCheck, LocateFixed, MapPinCheck, MapPinOff, Search, ShieldAlert, Ticket } from 'lucide-react-native';
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
    locationVerificationMessage,
    locationVerificationRequired,
    locationVerificationStatus,
    markLocationOverride,
    partyName,
    partySource,
    period,
    playerError,
    playerNickname,
    requestLocationVerification,
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
  const locationGateSatisfied =
    !locationVerificationRequired ||
    locationVerificationStatus === 'verified' ||
    locationVerificationStatus === 'overridden';
  const locationBanner = getLocationBanner(locationVerificationStatus, locationVerificationMessage, period.weekLabel);

  return (
    <Screen
      eyebrow={showTeams ? locationBanner.eyebrow : 'PLAYER CHECK-IN'}
      title={showTeams ? 'Choose your side' : 'Join the room'}
    >
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
            icon={locationBanner.icon}
            title={partyName}
            subtitle={locationBanner.subtitle}
            color={locationBanner.color}
          />
          {locationVerificationRequired && !locationGateSatisfied ? (
            <View style={styles.twoColumn}>
              <ActionButton
                label={locationVerificationStatus === 'checking' ? 'Checking...' : 'Check venue'}
                icon={LocateFixed}
                onPress={requestLocationVerification}
                disabled={locationVerificationStatus === 'checking' || isCheckingIn}
                primary
              />
              <ActionButton
                label="Host override"
                icon={ShieldAlert}
                onPress={markLocationOverride}
                disabled={locationVerificationStatus === 'checking' || isCheckingIn}
              />
            </View>
          ) : null}
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
            disabled={!selectedTeam || !nickname.trim() || !locationGateSatisfied || isCheckingIn}
            danger
          />
        </>
      ) : null}
    </Screen>
  );
}

function getLocationBanner(
  status: 'not_required' | 'required' | 'checking' | 'verified' | 'failed' | 'overridden',
  message: string | undefined,
  weekLabel: string,
) {
  switch (status) {
    case 'required':
      return {
        eyebrow: 'VENUE CHECK',
        icon: LocateFixed,
        subtitle: message ?? 'Venue-only check-in is required for this room.',
        color: '#FFCB45',
      };
    case 'checking':
      return {
        eyebrow: 'CHECKING VENUE',
        icon: LocateFixed,
        subtitle: message ?? 'Checking whether this device is at the venue.',
        color: '#FFCB45',
      };
    case 'failed':
      return {
        eyebrow: 'HOST OVERRIDE',
        icon: MapPinOff,
        subtitle: message ?? 'Venue check failed. Ask the host to override.',
        color: '#FF5C8A',
      };
    case 'overridden':
      return {
        eyebrow: 'OVERRIDE NOTED',
        icon: ShieldAlert,
        subtitle: message ?? `Host override noted / ${weekLabel}`,
        color: '#3DF5D8',
      };
    case 'verified':
      return {
        eyebrow: 'VENUE VERIFIED',
        icon: MapPinCheck,
        subtitle: message ?? `Venue verified / ${weekLabel}`,
        color: '#3DF5D8',
      };
    default:
      return {
        eyebrow: 'ROOM FOUND',
        icon: Ticket,
        subtitle: `Venue check not required / ${weekLabel}`,
        color: '#65B8FF',
      };
  }
}
