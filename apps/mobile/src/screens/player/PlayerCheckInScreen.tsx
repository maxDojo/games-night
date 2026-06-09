import { useEffect, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { BadgeCheck, LocateFixed, MapPinCheck, MapPinOff, Search, ShieldAlert, Ticket } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { TeamCard } from '../../components/game/TeamCard';
import { Screen } from '../../components/layout/Screen';
import { ActionButton } from '../../components/ui/ActionButton';
import { InfoBanner } from '../../components/ui/InfoBanner';
import { usePartyState } from '../../state/PartyState';
import { useAppStyles } from '../../theme/useAppStyles';

export function PlayerCheckInScreen() {
  const { styles, theme } = useAppStyles();
  const params = useLocalSearchParams<{ joinCode?: string }>();
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
    partyStatus,
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
  const canCheckIn = partyStatus === 'LOBBY';
  const checkInClosedMessage = getCheckInClosedMessage(partyStatus);
  const initialJoinCode = typeof params.joinCode === 'string'
    ? params.joinCode.toUpperCase().replace(/[^A-Z2-9]/gu, '').slice(0, 6)
    : '';

  useEffect(() => {
    if (partySource === 'api') {
      setJoinCodeInput(joinCode);
    }
  }, [joinCode, partySource]);

  useEffect(() => {
    if (initialJoinCode.length === 6 && partySource !== 'api') {
      setJoinCodeInput(initialJoinCode);
      void loadPlayerParty(initialJoinCode);
    }
  }, [initialJoinCode, loadPlayerParty, partySource]);

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
      avatarLabel={showTeams ? playerNickname || nickname || partyName : undefined}
      eyebrow={showTeams ? locationBanner.eyebrow : 'PLAYER CHECK-IN'}
      immersive
      roomCode={showTeams ? joinCode : undefined}
      roomStatus={showTeams ? partyStatus ?? 'LOBBY' : undefined}
      title={showTeams ? 'Choose your side' : 'Join the room'}
    >
      <View style={styles.luminousHeroPanel}>
        <View style={styles.glowStrip} />
        <Text style={styles.luminousHeroMeta}>{showTeams ? 'ROOM FOUND' : 'ENTER HOST CODE'}</Text>
        <Text style={styles.luminousHeroTitle}>{showTeams ? partyName : 'Find tonight\'s room'}</Text>
        <Text style={styles.centeredBodyText}>
          {showTeams
            ? 'Pick an open team and check in. Scores stay sealed until the host reveal.'
            : 'Enter the code from the host to join the active party.'}
        </Text>
      </View>

      <View style={[styles.card, styles.roomEntryCard]}>
        <View style={styles.glowStrip} />
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
            subtitle={checkInClosedMessage ?? locationBanner.subtitle}
            color={checkInClosedMessage ? theme.palette.accent : locationBanner.color}
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
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Available Teams</Text>
            <Text style={styles.positiveText}>{teams.length} squads</Text>
          </View>
          <View style={styles.stack}>
            {teams.map((team) => (
              <TeamCard
                key={team.id}
                team={team}
                selected={team.id === selectedTeam?.id}
                showPoints={false}
                disabled={!canCheckIn || team.checkedIn >= team.capacity || isCheckingIn}
                onPress={() => selectTeam(team.id)}
              />
            ))}
          </View>
          <View style={styles.bottomCtaWrap}>
            <ActionButton
              label={
                isCheckingIn
                  ? 'Checking in...'
                  : !canCheckIn
                    ? 'Check-in closed'
                  : selectedTeam
                    ? `Check in to ${selectedTeam.name}`
                    : 'Choose an open team'
              }
              icon={BadgeCheck}
              onPress={handleCheckIn}
              disabled={!canCheckIn || !selectedTeam || !nickname.trim() || !locationGateSatisfied || isCheckingIn}
              danger
            />
          </View>
        </>
      ) : null}
    </Screen>
  );
}

function getCheckInClosedMessage(status: string | undefined) {
  switch (status) {
    case 'IN_PROGRESS':
      return 'This code is active, but team check-in is closed because the party has already started.';
    case 'PAUSED':
      return 'This party is paused. Ask the host when check-in reopens.';
    case 'FINISHED':
      return 'This party has ended. Ask the host for the next active room code.';
    case 'CANCELLED':
      return 'This party was cancelled. Ask the host for the active room code.';
    default:
      return undefined;
  }
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
        color: '#FD7A10',
      };
    case 'checking':
      return {
        eyebrow: 'CHECKING VENUE',
        icon: LocateFixed,
        subtitle: message ?? 'Checking whether this device is at the venue.',
        color: '#FD7A10',
      };
    case 'failed':
      return {
        eyebrow: 'HOST OVERRIDE',
        icon: MapPinOff,
        subtitle: message ?? 'Venue check failed. Ask the host to override.',
        color: '#FD5462',
      };
    case 'overridden':
      return {
        eyebrow: 'OVERRIDE NOTED',
        icon: ShieldAlert,
        subtitle: message ?? `Host override noted / ${weekLabel}`,
        color: '#05D7C1',
      };
    case 'verified':
      return {
        eyebrow: 'VENUE VERIFIED',
        icon: MapPinCheck,
        subtitle: message ?? `Venue verified / ${weekLabel}`,
        color: '#05D7C1',
      };
    default:
      return {
        eyebrow: 'ROOM FOUND',
        icon: Ticket,
        subtitle: `Venue check not required / ${weekLabel}`,
        color: '#9A73D9',
      };
  }
}
