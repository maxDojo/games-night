import { Text, View } from 'react-native';
import { Clock, EyeOff, Radio, ShieldCheck } from 'lucide-react-native';

import { Screen } from '../../components/layout/Screen';
import { InfoBanner } from '../../components/ui/InfoBanner';
import { Stat } from '../../components/ui/Stat';
import { usePartyState } from '../../state/PartyState';
import { useAppStyles } from '../../theme/useAppStyles';

function formatPartyStatus(status?: string) {
  switch (status) {
    case 'IN_PROGRESS':
      return 'LIVE';
    case 'CANCELLED':
      return 'OFF';
    case 'FINISHED':
      return 'DONE';
    default:
      return status ?? 'LOBBY';
  }
}

export function PlayerAnswerScreen() {
  const { styles, theme } = useAppStyles();
  const {
    checkedInTeam,
    currentRound,
    isLoadingRounds,
    nextRound,
    partyName,
    partyStatus,
    playerNickname,
    playerRounds,
  } = usePartyState();
  const activeRound = currentRound ?? nextRound;
  const statusTitle = currentRound ? `${currentRound.label} is live` : 'Waiting for host';
  const statusSubtitle = currentRound
    ? 'You are in the room. Watch for the host prompt.'
    : nextRound
      ? `${nextRound.label} is queued next. Scores remain sealed.`
      : 'No queued round yet. Scores remain sealed.';

  return (
    <Screen eyebrow="PLAYER STATUS" title={statusTitle}>
      <InfoBanner
        icon={currentRound ? Radio : Clock}
        title={partyName}
        subtitle={statusSubtitle}
        color={currentRound ? theme.palette.success : theme.palette.info}
      />

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.metaLabelAccent}>YOUR CHECK-IN</Text>
          <ShieldCheck color={theme.palette.success} size={18} />
        </View>
        <Text style={styles.cardTitle}>{checkedInTeam?.name ?? 'Team confirmed'}</Text>
        <Text style={styles.bodyText}>
          {playerNickname ? `${playerNickname} is checked in. ` : null}
          Your device shows party status only. Live team totals are hidden until the host reveals them.
        </Text>
      </View>

      <View style={styles.statRow}>
        <Stat value={formatPartyStatus(partyStatus)} label="room" accent />
        <Stat value={playerRounds.length.toString()} label="rounds" />
        <Stat value="sealed" label="scores" danger />
      </View>

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.metaLabelAccent}>ROUND STATUS</Text>
          <EyeOff color={theme.palette.danger} size={18} />
        </View>
        <Text style={styles.cardTitle}>
          {isLoadingRounds ? 'Syncing queue...' : activeRound ? activeRound.label : 'No round queued'}
        </Text>
        <Text style={styles.bodyText}>
          {activeRound
            ? `${activeRound.detail}. The host controls when player actions unlock.`
            : 'Stay nearby. The host can queue or start the next game from their device.'}
        </Text>
      </View>
    </Screen>
  );
}
