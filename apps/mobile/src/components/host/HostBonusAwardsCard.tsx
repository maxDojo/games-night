import { Text, View } from 'react-native';
import { Award, Gift } from 'lucide-react-native';

import { TeamCard } from '../game/TeamCard';
import { AnimatedPressable } from '../motion';
import { ActionButton } from '../ui/ActionButton';
import { useAppStyles } from '../../theme/useAppStyles';
import type { BonusAwardSummary, TeamSummary } from '../../types/product';

interface HostBonusAwardsCardProps {
  awardedBonusIds: string[];
  bonuses: BonusAwardSummary[];
  disabled?: boolean;
  isAwarding?: boolean;
  onAward: (bonusId: string, teamId: string) => void;
  onSelectBonus: (bonusId: string) => void;
  onSelectTeam: (teamId: string) => void;
  selectedBonusId?: string;
  selectedTeamId?: string;
  teams: TeamSummary[];
}

export function HostBonusAwardsCard({
  awardedBonusIds,
  bonuses,
  disabled,
  isAwarding,
  onAward,
  onSelectBonus,
  onSelectTeam,
  selectedBonusId,
  selectedTeamId,
  teams,
}: HostBonusAwardsCardProps) {
  const { styles, theme } = useAppStyles();
  const selectedBonus = bonuses.find((bonus) => bonus.id === selectedBonusId && !awardedBonusIds.includes(bonus.id));
  const selectedTeam = teams.find((team) => team.id === selectedTeamId);
  const awardDisabled = disabled || isAwarding || !selectedBonus || !selectedTeam;

  return (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <Text style={styles.metaLabelAccent}>SPECIAL BONUSES</Text>
        <Gift color={theme.palette.info} size={18} />
      </View>
      <Text style={styles.bodyText}>
        Choose a bonus and the exact team receiving it. Awards stay hidden from players until reveal.
      </Text>

      <View style={styles.stack}>
        {bonuses.map((bonus) => {
          const awarded = awardedBonusIds.includes(bonus.id);
          const selected = selectedBonusId === bonus.id && !awarded;

          return (
            <AnimatedPressable
              key={bonus.id}
              disabled={disabled || awarded || isAwarding}
              onPress={() => onSelectBonus(bonus.id)}
              style={[styles.scoreLogItem, selected && styles.roundSelected, awarded && styles.disabledCard]}
            >
              <View style={styles.flex}>
                <Text style={[styles.scoreLogLabel, selected && styles.roundTextSelected]}>{bonus.label}</Text>
                <Text style={[styles.teamMeta, selected && styles.teamMetaSelected]}>{bonus.reason}</Text>
              </View>
              <Text style={[styles.scoreLogDelta, { color: selected ? theme.palette.ink : theme.palette.success }]}>
                {awarded ? 'Awarded' : `+${bonus.points}`}
              </Text>
            </AnimatedPressable>
          );
        })}
      </View>

      <View style={styles.stack}>
        <Text style={styles.metaLabelAccent}>TARGET TEAM</Text>
        {teams.length > 0 ? (
          teams.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              selected={team.id === selectedTeamId}
              showPoints={false}
              disabled={disabled || isAwarding}
              onPress={() => onSelectTeam(team.id)}
            />
          ))
        ) : (
          <Text style={styles.bodyText}>Create teams before awarding bonuses.</Text>
        )}
      </View>

      <ActionButton
        label={
          isAwarding
            ? 'Awarding...'
            : selectedBonus && selectedTeam
              ? `Award to ${selectedTeam.name}`
              : 'Choose bonus and team'
        }
        icon={Award}
        onPress={() => selectedBonus && selectedTeam && onAward(selectedBonus.id, selectedTeam.id)}
        disabled={awardDisabled}
        success
      />
    </View>
  );
}
