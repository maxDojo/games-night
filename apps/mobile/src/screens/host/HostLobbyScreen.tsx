import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { Award, ClipboardList, Gift, Play, Plus, Sparkles } from 'lucide-react-native';

import { Screen } from '../../components/layout/Screen';
import { ActionButton } from '../../components/ui/ActionButton';
import { InfoBanner } from '../../components/ui/InfoBanner';
import { Pill } from '../../components/ui/Badges';
import { Stat } from '../../components/ui/Stat';
import { usePartyState } from '../../state/PartyState';
import { useAppStyles } from '../../theme/useAppStyles';

export function HostLobbyScreen() {
  const { styles, theme } = useAppStyles();
  const {
    awardNextBonus,
    awardedBonusIds,
    bonusAwards,
    createHostParty,
    hostParty,
    hostPartyError,
    hostUser,
    isCreatingHostParty,
    queuedRounds,
    revealScores,
    scoresRevealed,
    teams,
    totalPlayers,
  } = usePartyState();
  const [partyName, setPartyName] = useState(hostUser ? `${hostUser.displayName}'s House` : 'Games Night');
  const [maxTeams, setMaxTeams] = useState('4');
  const [maxPerTeam, setMaxPerTeam] = useState('8');
  const nextRound = queuedRounds.find((round) => round.status === 'PENDING') ?? queuedRounds[0];
  const bonusLabel = awardedBonusIds.length >= bonusAwards.length ? 'Bonuses done' : 'Award bonus';
  const roomCode = hostParty?.joinCode ?? '------';
  const roomName = hostParty?.name ?? theme.displayName;
  const roomStatus = hostParty?.status ?? 'DRAFT';
  const teamCapacity = hostParty ? `${hostParty.maxTeams} x ${hostParty.maxPerTeam}` : `${maxTeams} x ${maxPerTeam}`;
  const playerCount = hostParty ? 0 : totalPlayers;

  const handleCreateParty = () => {
    void createHostParty(partyName, Number(maxTeams), Number(maxPerTeam));
  };

  return (
    <Screen eyebrow={hostUser ? `HOST: ${hostUser.displayName}` : 'THEMED ROOM'} title={roomName}>
      {hostParty ? null : (
        <>
          <InfoBanner
            icon={Sparkles}
            title="Create tonight's room"
            subtitle="Party creation is live. Theme images and uploads stay for a later slice."
            color={theme.palette.info}
          />
          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.metaLabelAccent}>PARTY NAME</Text>
              <TextInput
                autoCapitalize="words"
                autoCorrect={false}
                editable={!isCreatingHostParty}
                maxLength={80}
                onChangeText={setPartyName}
                placeholder="Greg's House"
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
          </View>
          {hostPartyError ? <Text style={styles.errorText}>{hostPartyError}</Text> : null}
          <ActionButton
            label={isCreatingHostParty ? 'Creating...' : 'Create party'}
            icon={Plus}
            onPress={handleCreateParty}
            disabled={
              isCreatingHostParty ||
              !partyName.trim() ||
              Number(maxTeams) < 2 ||
              Number(maxTeams) > 8 ||
              Number(maxPerTeam) < 1 ||
              Number(maxPerTeam) > 10
            }
            primary
          />
        </>
      )}
      <View style={styles.roomCard}>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.metaLabelLight}>ROOM CODE</Text>
            <Text style={styles.bigCode}>{roomCode}</Text>
          </View>
          <Pill label={roomStatus} />
        </View>
        <View style={styles.statRow}>
          <Stat value={hostParty ? hostParty.maxTeams.toString() : teams.length.toString()} label="teams" />
          <Stat value={playerCount.toString()} label="players" />
          <Stat value={teamCapacity} label="capacity" accent={Boolean(hostParty)} />
        </View>
      </View>
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.metaLabelAccent}>NEXT ROUND</Text>
          <Text style={styles.positiveText}>{nextRound ? `${nextRound.points} pts` : 'Queue empty'}</Text>
        </View>
        <Text style={styles.cardTitle}>{nextRound?.label ?? 'Build the queue'}</Text>
        <Text style={styles.bodyText}>
          Queue rounds from the host phone. Corrections and special bonuses require a reason and stay visible in the final audit.
        </Text>
      </View>
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.metaLabelAccent}>SPECIAL BONUSES</Text>
          <Gift color={theme.palette.info} size={18} />
        </View>
        <Text style={styles.bodyText}>
          Award room-energy points without exposing the live leaderboard to players.
        </Text>
        <View style={styles.stack}>
          {bonusAwards.map((bonus) => (
            <View key={bonus.id} style={styles.scoreLogItem}>
              <View style={styles.flex}>
                <Text style={styles.scoreLogLabel}>{bonus.label}</Text>
                <Text style={styles.teamMeta}>{bonus.reason}</Text>
              </View>
              <Text style={[styles.scoreLogDelta, { color: theme.palette.success }]}>
                {awardedBonusIds.includes(bonus.id) ? 'Awarded' : `+${bonus.points}`}
              </Text>
            </View>
          ))}
        </View>
      </View>
      <View style={styles.twoColumn}>
        <ActionButton label="Start" icon={Play} onPress={() => undefined} primary />
        <ActionButton
          label={bonusLabel}
          icon={Award}
          onPress={awardNextBonus}
          disabled={awardedBonusIds.length >= bonusAwards.length}
          success
        />
      </View>
      <View style={styles.twoColumn}>
        <ActionButton label="Score log" icon={ClipboardList} onPress={() => undefined} />
        <ActionButton
          label={scoresRevealed ? 'Revealed' : 'Reveal'}
          icon={Gift}
          onPress={revealScores}
          disabled={scoresRevealed}
        />
      </View>
    </Screen>
  );
}
