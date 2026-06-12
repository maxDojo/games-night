import { ArrowRight, Check, History, Radio } from 'lucide-react-native';
import { Text, View } from 'react-native';

import type { HostPartySummary } from '../../api/client';
import { useAppStyles } from '../../theme/useAppStyles';
import { ActionButton } from '../ui/ActionButton';
import { Pill } from '../ui/Badges';
import { Stat } from '../ui/Stat';

interface HostPartyCardProps {
  disabled?: boolean;
  onOpen: () => void;
  onSelect: () => void;
  party: HostPartySummary;
}

export function HostPartyCard({ disabled, onOpen, onSelect, party }: HostPartyCardProps) {
  const { styles, theme } = useAppStyles();
  const isTerminal = party.status === 'FINISHED' || party.status === 'CANCELLED';
  const date = new Date(party.finishedAt ?? party.startedAt ?? party.createdAt).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <View style={[styles.card, party.isCurrent && styles.cardAccent]}>
      <View style={styles.rowBetween}>
        <View style={styles.partyCardCopy}>
          <Text style={styles.cardTitle}>{party.name}</Text>
          <Text style={styles.bodyText}>
            {party.joinCode} | {date}
          </Text>
        </View>
        <Pill label={party.isCurrent ? 'CURRENT' : party.status.replace('_', ' ')} />
      </View>

      <View style={styles.statRow}>
        <Stat value={party.teamCount.toString()} label="teams" />
        <Stat value={party.playerCount.toString()} label="players" />
        <Stat value={party.roundCount.toString()} label="rounds" accent={party.isCurrent} />
      </View>

      {party.isCurrent ? (
        <ActionButton label="Open dashboard" icon={ArrowRight} onPress={onOpen} primary />
      ) : isTerminal ? (
        <View style={styles.partyHistoryNote}>
          <History color={theme.palette.muted} size={16} />
          <Text style={styles.bodyText}>History preserved. Finished rooms cannot become current.</Text>
        </View>
      ) : (
        <ActionButton
          disabled={disabled}
          icon={party.status === 'PAUSED' ? Radio : Check}
          label={disabled ? 'Switching...' : 'Make current'}
          onPress={onSelect}
        />
      )}
    </View>
  );
}
