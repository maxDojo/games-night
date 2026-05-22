import { useMemo, useState, type ReactNode } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  ArrowRight,
  BadgeAlert,
  BadgeCheck,
  Ban,
  Brain,
  Check,
  ClipboardList,
  Crown,
  Drama,
  EyeOff,
  List,
  MessageCircle,
  Play,
  Plus,
  Save,
  Shuffle,
  SlidersHorizontal,
  Sparkles,
  Ticket,
  Timer,
  Trophy,
  Users,
  type LucideIcon,
} from 'lucide-react-native';

import { joinCode, period, queuedRounds, scoreEvents, teams } from './src/data/mockState';
import { saveSession } from './src/storage/sessionStore';
import { ThemeProvider, useThemeProfile } from './src/theme/theme';
import type { AppMode, HostRoute, PlayerRoute, QueuedRoundSummary, TeamSummary } from './src/types/product';

function AppShell() {
  const theme = useThemeProfile();
  const [mode, setMode] = useState<AppMode>('welcome');
  const [playerRoute, setPlayerRoute] = useState<PlayerRoute>('check-in');
  const [hostRoute, setHostRoute] = useState<HostRoute>('lobby');

  const styles = useMemo(() => createStyles(theme.palette), [theme.palette]);

  const enterPlayer = () => {
    void saveSession({ joinCode, teamId: teams[0]?.id });
    setMode('player');
    setPlayerRoute('check-in');
  };

  const enterHost = () => {
    setMode('host');
    setHostRoute('lobby');
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" />
      {mode === 'welcome' ? (
        <WelcomeScreen onHost={enterHost} onPlayer={enterPlayer} />
      ) : mode === 'player' ? (
        <>
          {playerRoute === 'check-in' ? <PlayerCheckInScreen /> : null}
          {playerRoute === 'answer' ? <PlayerAnswerScreen /> : null}
          {playerRoute === 'standings' ? <PlayerStandingsScreen /> : null}
          <PlayerNav active={playerRoute} onChange={setPlayerRoute} />
        </>
      ) : (
        <>
          {hostRoute === 'lobby' ? <HostLobbyScreen /> : null}
          {hostRoute === 'queue' ? <HostQueueScreen /> : null}
          {hostRoute === 'stage' ? <HostStageScreen /> : null}
          {hostRoute === 'teams' ? <HostTeamsScreen /> : null}
          <HostNav active={hostRoute} onChange={setHostRoute} />
        </>
      )}
    </SafeAreaView>
  );
}

function WelcomeScreen({ onHost, onPlayer }: { onHost: () => void; onPlayer: () => void }) {
  const theme = useThemeProfile();
  const styles = useMemo(() => createStyles(theme.palette), [theme.palette]);

  return (
    <Screen>
      <View style={styles.poster}>
        <View style={styles.rowBetween}>
          <Text style={styles.eyebrow}>{theme.displayName.toUpperCase()}</Text>
          <Pill label="THEMED" tone="success" icon={Sparkles} />
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>{theme.displayName}</Text>
          <Text style={styles.bodyText}>
            Friday league, custom games, team chaos, and every point on the record.
          </Text>
        </View>
        <View style={styles.tokenRow}>
          <Token label="Quiz" icon={Brain} color={theme.palette.accent} />
          <Token label="Act" icon={Drama} color={theme.palette.info} />
          <Token label="Taboo" icon={BadgeAlert} color="#FF7A3D" />
        </View>
      </View>

      <View style={styles.cardCompact}>
        <View>
          <Text style={styles.metaLabel}>JOIN {theme.displayName.toUpperCase()}</Text>
          <Text style={styles.codeText}>{joinCode}</Text>
        </View>
        <ArrowRight color={theme.palette.info} size={22} />
      </View>

      <View style={styles.twoColumn}>
        <ActionButton label="Host" icon={Crown} onPress={onHost} primary />
        <ActionButton label="Player" icon={Users} onPress={onPlayer} />
      </View>
    </Screen>
  );
}

function PlayerCheckInScreen() {
  const theme = useThemeProfile();
  const styles = useMemo(() => createStyles(theme.palette), [theme.palette]);

  return (
    <Screen eyebrow="VENUE VERIFIED" title="Choose your side">
      <Text style={styles.bodyText}>
        You are inside the venue radius. Pick a team before it fills up.
      </Text>
      <InfoBanner
        icon={Ticket}
        title={period.name}
        subtitle={`Venue verified / ${period.weekLabel}`}
        color={theme.palette.info}
      />
      <View style={styles.stack}>
        {teams.map((team) => (
          <TeamCard key={team.id} team={team} selected={team.isSelected} />
        ))}
      </View>
      <ActionButton label="Check in to Neon Noodles" icon={BadgeCheck} onPress={() => undefined} danger />
    </Screen>
  );
}

function PlayerAnswerScreen() {
  const theme = useThemeProfile();
  const styles = useMemo(() => createStyles(theme.palette), [theme.palette]);

  return (
    <Screen eyebrow="TRIVIA / TV + PHONES" title="Question 4">
      <View style={styles.questionPanel}>
        <View style={styles.rowBetween}>
          <Text style={styles.darkMeta}>09 seconds</Text>
          <Text style={styles.lightMeta}>+70 max</Text>
        </View>
        <Text style={styles.questionText}>Which planet spins fastest?</Text>
        <View style={styles.lockNote}>
          <BadgeCheck color={theme.palette.accent} size={15} />
          <Text style={styles.lockText}>Question shown here / first team answer counts</Text>
        </View>
      </View>
      <View style={styles.stack}>
        <AnswerOption keyLabel="A" label="Jupiter" selected />
        <AnswerOption keyLabel="B" label="Mars" />
        <AnswerOption keyLabel="C" label="Mercury" />
      </View>
    </Screen>
  );
}

function PlayerStandingsScreen() {
  const theme = useThemeProfile();
  const styles = useMemo(() => createStyles(theme.palette), [theme.palette]);

  return (
    <Screen eyebrow={`${theme.displayName.toUpperCase()} LEAGUE`} title="Scoreboard">
      <Text style={styles.bodyText}>
        Weekly standings, point swings, and corrections across the period.
      </Text>
      <View style={styles.podium}>
        <PodiumCard rank="2" name="Pirates" points="1,110" color={theme.palette.danger} />
        <PodiumCard rank="1" name="Noodles" points="1,340" color={theme.palette.accent} winner />
        <PodiumCard rank="3" name="Queens" points="980" color={theme.palette.info} />
      </View>
      <Text style={styles.sectionTitle}>Score log</Text>
      {scoreEvents.map((event) => (
        <ScoreLogItem key={event.id} label={event.label} delta={event.delta} />
      ))}
    </Screen>
  );
}

function HostLobbyScreen() {
  const theme = useThemeProfile();
  const styles = useMemo(() => createStyles(theme.palette), [theme.palette]);

  return (
    <Screen eyebrow="THEMED ROOM" title={theme.displayName}>
      <View style={styles.roomCard}>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.metaLabelLight}>ROOM CODE</Text>
            <Text style={styles.bigCode}>{joinCode}</Text>
          </View>
          <Pill label="LIVE" tone="success" />
        </View>
        <View style={styles.statRow}>
          <Stat value="3" label="teams" />
          <Stat value="19" label="players" />
          <Stat value="6" label="rounds" />
        </View>
      </View>
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.metaLabelAccent}>NEXT ROUND</Text>
          <Text style={styles.positiveText}>650 pts</Text>
        </View>
        <Text style={styles.cardTitle}>Custom: Word Scramble</Text>
        <Text style={styles.bodyText}>
          Manual score round. Corrections require a reason and stay visible in the score log.
        </Text>
      </View>
      <View style={styles.twoColumn}>
        <ActionButton label="Start" icon={Play} onPress={() => undefined} primary />
        <ActionButton label="Score log" icon={ClipboardList} onPress={() => undefined} />
      </View>
    </Screen>
  );
}

function HostQueueScreen() {
  const theme = useThemeProfile();
  const styles = useMemo(() => createStyles(theme.palette), [theme.palette]);

  return (
    <Screen eyebrow="QUEUE LAB / TV + PHONES" title="Build the run">
      <InfoBanner
        icon={Save}
        title={`Plan: ${theme.displayName} Friday`}
        subtitle="Saved queue / custom games enabled"
        color={theme.palette.danger}
      />
      <View style={styles.stack}>
        {queuedRounds.map((round) => (
          <QueuedRoundCard key={round.id} round={round} />
        ))}
      </View>
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>Point dial / selected round</Text>
          <Text style={styles.pointValue}>650</Text>
        </View>
        <View style={styles.threeColumn}>
          <SmallButton label="-50" danger />
          <SmallButton label="base" />
          <SmallButton label="+100" primary />
        </View>
      </View>
    </Screen>
  );
}

function HostStageScreen() {
  const theme = useThemeProfile();
  const styles = useMemo(() => createStyles(theme.palette), [theme.palette]);

  return (
    <Screen eyebrow="PRIVATE STAGE / HOST ONLY" title="Taboo">
      <View style={styles.timerCard}>
        <Text style={styles.timerText}>00:39</Text>
        <Text style={styles.timerSubtext}>clue-giver has the phone</Text>
      </View>
      <View style={styles.secretCard}>
        <View style={styles.rowBetween}>
          <Text style={styles.darkMeta}>HOST PHONE ONLY / DO NOT CAST</Text>
          <EyeOff color={theme.palette.ink} size={18} />
        </View>
        <Text style={styles.secretWord}>Spreadsheet</Text>
        <View style={styles.threeColumn}>
          <ForbiddenWord label="Excel" />
          <ForbiddenWord label="Cells" />
          <ForbiddenWord label="Rows" />
        </View>
      </View>
      <View style={styles.twoColumn}>
        <ActionButton label="Correct" icon={Check} onPress={() => undefined} success />
        <ActionButton label="Taboo" icon={Ban} onPress={() => undefined} danger />
      </View>
      <View style={styles.statRow}>
        <Stat value="5" label="correct" />
        <Stat value="1" label="taboo" danger />
        <Stat value="650" label="points" accent />
      </View>
    </Screen>
  );
}

function HostTeamsScreen() {
  const theme = useThemeProfile();
  const styles = useMemo(() => createStyles(theme.palette), [theme.palette]);

  return (
    <Screen eyebrow="TEAM SEASON" title={`${theme.displayName} teams`}>
      <Text style={styles.bodyText}>
        Capacity limits keep teams fair. Players check in without profiles.
      </Text>
      <InfoBanner
        icon={Users}
        title={period.name}
        subtitle={`Leaderboard aggregates linked parties. Capacity: ${period.capacityLabel}`}
        color={theme.palette.success}
      />
      <View style={styles.stack}>
        {teams.map((team) => (
          <TeamCard key={team.id} team={team} selected={team.isSelected} />
        ))}
      </View>
      <View style={styles.twoColumn}>
        <ActionButton label="Team" icon={Plus} onPress={() => undefined} primary />
        <ActionButton label="Move" icon={Shuffle} onPress={() => undefined} />
      </View>
    </Screen>
  );
}

function Screen({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title?: string;
  children: ReactNode;
}) {
  const theme = useThemeProfile();
  const styles = useMemo(() => createStyles(theme.palette), [theme.palette]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent}>
      {eyebrow || title ? (
        <View style={styles.header}>
          {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
          {title ? <Text style={styles.title}>{title}</Text> : null}
        </View>
      ) : null}
      {children}
    </ScrollView>
  );
}

function PlayerNav({
  active,
  onChange,
}: {
  active: PlayerRoute;
  onChange: (route: PlayerRoute) => void;
}) {
  return (
    <BottomNav
      items={[
        { route: 'check-in', label: 'TEAM', icon: Users },
        { route: 'answer', label: 'PLAY', icon: MessageCircle },
        { route: 'standings', label: 'BOARD', icon: Trophy },
      ]}
      active={active}
      onChange={onChange}
    />
  );
}

function HostNav({ active, onChange }: { active: HostRoute; onChange: (route: HostRoute) => void }) {
  return (
    <BottomNav
      items={[
        { route: 'lobby', label: 'HOST', icon: Crown },
        { route: 'queue', label: 'RUN', icon: List },
        { route: 'teams', label: 'TEAMS', icon: Users },
        { route: 'stage', label: 'LIVE', icon: Timer },
      ]}
      active={active}
      onChange={onChange}
    />
  );
}

function BottomNav<T extends string>({
  items,
  active,
  onChange,
}: {
  items: Array<{ route: T; label: string; icon: LucideIcon }>;
  active: T;
  onChange: (route: T) => void;
}) {
  const theme = useThemeProfile();
  const styles = useMemo(() => createStyles(theme.palette), [theme.palette]);

  return (
    <View style={styles.navWrap}>
      <View style={styles.navPill}>
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = item.route === active;
          return (
            <Pressable
              key={item.route}
              style={[styles.navItem, isActive && styles.navItemActive]}
              onPress={() => onChange(item.route)}
            >
              <Icon color={isActive ? theme.palette.ink : theme.palette.muted} size={18} />
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Token({ label, icon: Icon, color }: { label: string; icon: LucideIcon; color: string }) {
  const theme = useThemeProfile();
  const styles = useMemo(() => createStyles(theme.palette), [theme.palette]);
  return (
    <View style={[styles.token, { backgroundColor: color }]}>
      <Icon color={theme.palette.ink} size={22} />
      <Text style={styles.tokenText}>{label}</Text>
    </View>
  );
}

function Pill({ label, tone, icon: Icon }: { label: string; tone: 'success'; icon?: LucideIcon }) {
  const theme = useThemeProfile();
  const styles = useMemo(() => createStyles(theme.palette), [theme.palette]);
  return (
    <View style={styles.pill}>
      <View style={[styles.pillDot, { backgroundColor: theme.palette.success }]} />
      {Icon ? <Icon color={theme.palette.foreground} size={12} /> : null}
      <Text style={styles.pillText}>{label}</Text>
    </View>
  );
}

function InfoBanner({
  icon: Icon,
  title,
  subtitle,
  color,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  color: string;
}) {
  const theme = useThemeProfile();
  const styles = useMemo(() => createStyles(theme.palette), [theme.palette]);
  return (
    <View style={[styles.infoBanner, { backgroundColor: color }]}>
      <Icon color={theme.palette.ink} size={24} />
      <View style={styles.flex}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

function TeamCard({ team, selected }: { team: TeamSummary; selected?: boolean }) {
  const theme = useThemeProfile();
  const styles = useMemo(() => createStyles(theme.palette), [theme.palette]);
  const full = team.checkedIn >= team.capacity;
  return (
    <View style={[styles.teamCard, selected && styles.teamCardSelected]}>
      <View style={[styles.teamGlyph, { backgroundColor: selected ? theme.palette.ink : team.color }]}>
        <Text style={[styles.teamGlyphText, selected && { color: team.color }]}>{team.shortName}</Text>
      </View>
      <View style={styles.flex}>
        <Text style={[styles.teamName, selected && styles.teamNameSelected]}>{team.name}</Text>
        <Text style={[styles.teamMeta, selected && styles.teamMetaSelected]}>
          {team.checkedIn}/{team.capacity} {full ? 'full' : 'checked in'} / {team.points.toLocaleString()} pts
        </Text>
      </View>
      {selected ? <Check color={theme.palette.ink} size={21} /> : null}
    </View>
  );
}

function AnswerOption({
  keyLabel,
  label,
  selected,
}: {
  keyLabel: string;
  label: string;
  selected?: boolean;
}) {
  const theme = useThemeProfile();
  const styles = useMemo(() => createStyles(theme.palette), [theme.palette]);
  return (
    <View style={[styles.answerOption, selected && styles.answerSelected]}>
      <Text style={[styles.answerKey, selected && styles.answerKeySelected]}>{keyLabel}</Text>
      <Text style={[styles.answerLabel, selected && styles.answerLabelSelected]}>{label}</Text>
    </View>
  );
}

function PodiumCard({
  rank,
  name,
  points,
  color,
  winner,
}: {
  rank: string;
  name: string;
  points: string;
  color: string;
  winner?: boolean;
}) {
  const theme = useThemeProfile();
  const styles = useMemo(() => createStyles(theme.palette), [theme.palette]);
  return (
    <View style={[styles.podiumCard, winner && styles.podiumWinner]}>
      {winner ? <Crown color={theme.palette.ink} size={22} /> : <Text style={[styles.podiumRank, { color }]}>{rank}</Text>}
      <Text style={[styles.podiumName, winner && styles.podiumTextDark]}>{name}</Text>
      <Text style={[styles.podiumPoints, winner && styles.podiumTextDark]}>{points}</Text>
    </View>
  );
}

function ScoreLogItem({ label, delta }: { label: string; delta: number }) {
  const theme = useThemeProfile();
  const styles = useMemo(() => createStyles(theme.palette), [theme.palette]);
  const positive = delta > 0;
  return (
    <View style={styles.scoreLogItem}>
      <Text style={styles.scoreLogLabel}>{label}</Text>
      <Text style={[styles.scoreLogDelta, { color: positive ? theme.palette.success : theme.palette.danger }]}>
        {positive ? '+' : ''}
        {delta}
      </Text>
    </View>
  );
}

function QueuedRoundCard({ round }: { round: QueuedRoundSummary }) {
  const theme = useThemeProfile();
  const styles = useMemo(() => createStyles(theme.palette), [theme.palette]);
  const selected = round.order === 1;
  return (
    <View style={[styles.roundCard, selected && styles.roundSelected]}>
      <Text style={[styles.roundNumber, selected && styles.roundTextSelected]}>
        {round.order.toString().padStart(2, '0')}
      </Text>
      <View style={styles.flex}>
        <Text style={[styles.roundTitle, selected && styles.roundTextSelected]}>{round.label}</Text>
        <Text style={[styles.roundDetail, selected && styles.roundTextSelected]}>
          {round.points} pts / {round.detail}
        </Text>
      </View>
    </View>
  );
}

function ActionButton({
  label,
  icon: Icon,
  onPress,
  primary,
  danger,
  success,
}: {
  label: string;
  icon: LucideIcon;
  onPress: () => void;
  primary?: boolean;
  danger?: boolean;
  success?: boolean;
}) {
  const theme = useThemeProfile();
  const styles = useMemo(() => createStyles(theme.palette), [theme.palette]);
  const backgroundColor = primary
    ? theme.palette.accent
    : danger
      ? theme.palette.danger
      : success
        ? theme.palette.success
        : theme.palette.surface;
  const color = primary || success ? theme.palette.ink : theme.palette.foreground;
  return (
    <Pressable style={[styles.actionButton, { backgroundColor }]} onPress={onPress}>
      <Icon color={color} size={18} />
      <Text style={[styles.actionButtonText, { color }]}>{label}</Text>
    </Pressable>
  );
}

function SmallButton({ label, primary, danger }: { label: string; primary?: boolean; danger?: boolean }) {
  const theme = useThemeProfile();
  const styles = useMemo(() => createStyles(theme.palette), [theme.palette]);
  return (
    <View
      style={[
        styles.smallButton,
        primary && { backgroundColor: theme.palette.accent },
        danger && { backgroundColor: theme.palette.danger },
      ]}
    >
      <Text style={[styles.smallButtonText, primary && { color: theme.palette.ink }]}>{label}</Text>
    </View>
  );
}

function ForbiddenWord({ label }: { label: string }) {
  const theme = useThemeProfile();
  const styles = useMemo(() => createStyles(theme.palette), [theme.palette]);
  return (
    <View style={styles.forbiddenWord}>
      <Text style={styles.forbiddenText}>{label}</Text>
    </View>
  );
}

function Stat({
  value,
  label,
  danger,
  accent,
}: {
  value: string;
  label: string;
  danger?: boolean;
  accent?: boolean;
}) {
  const theme = useThemeProfile();
  const styles = useMemo(() => createStyles(theme.palette), [theme.palette]);
  return (
    <View style={styles.stat}>
      <Text
        style={[
          styles.statValue,
          danger && { color: theme.palette.danger },
          accent && { color: theme.palette.accent },
        ]}
      >
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  );
}

function createStyles(p: ReturnType<typeof useThemeProfile>['palette']) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: p.background,
    },
    screen: {
      flex: 1,
      backgroundColor: p.background,
    },
    screenContent: {
      gap: 14,
      paddingHorizontal: 18,
      paddingTop: 8,
      paddingBottom: 20,
    },
    header: {
      gap: 3,
    },
    eyebrow: {
      color: p.accent,
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 0,
      textTransform: 'uppercase',
    },
    title: {
      color: p.foreground,
      fontSize: 34,
      fontWeight: '900',
      letterSpacing: 0,
    },
    poster: {
      minHeight: 414,
      justifyContent: 'space-between',
      gap: 18,
      padding: 22,
      borderWidth: 1,
      borderColor: '#6B5BD6',
      borderRadius: 8,
      backgroundColor: p.surfaceAlt,
    },
    rowBetween: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    heroCopy: {
      gap: 8,
    },
    heroTitle: {
      color: p.foreground,
      fontSize: 41,
      fontWeight: '900',
      letterSpacing: 0,
    },
    bodyText: {
      color: p.muted,
      fontSize: 13,
      lineHeight: 17,
      letterSpacing: 0,
    },
    tokenRow: {
      flexDirection: 'row',
      gap: 10,
      height: 88,
    },
    token: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      borderRadius: 8,
    },
    tokenText: {
      color: p.ink,
      fontSize: 12,
      fontWeight: '900',
      letterSpacing: 0,
    },
    cardCompact: {
      minHeight: 68,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 14,
      borderWidth: 1,
      borderColor: p.line,
      borderRadius: 8,
      backgroundColor: p.surface,
    },
    metaLabel: {
      color: p.muted,
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 0,
      textTransform: 'uppercase',
    },
    codeText: {
      color: p.foreground,
      fontSize: 23,
      fontWeight: '900',
      letterSpacing: 0,
    },
    twoColumn: {
      flexDirection: 'row',
      gap: 10,
      minHeight: 58,
    },
    threeColumn: {
      flexDirection: 'row',
      gap: 8,
      minHeight: 48,
    },
    actionButton: {
      flex: 1,
      minHeight: 58,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: p.line,
    },
    actionButtonText: {
      fontSize: 15,
      fontWeight: '900',
      letterSpacing: 0,
    },
    stack: {
      gap: 10,
    },
    infoBanner: {
      minHeight: 84,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      borderRadius: 8,
    },
    flex: {
      flex: 1,
    },
    infoTitle: {
      color: p.ink,
      fontSize: 15,
      fontWeight: '900',
      letterSpacing: 0,
    },
    infoSubtitle: {
      color: '#173D38',
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0,
    },
    teamCard: {
      minHeight: 76,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: p.line,
      borderRadius: 8,
      backgroundColor: p.surface,
    },
    teamCardSelected: {
      minHeight: 86,
      backgroundColor: p.accent,
      borderColor: p.accent,
    },
    teamGlyph: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
    },
    teamGlyphText: {
      color: p.ink,
      fontSize: 20,
      fontWeight: '900',
      letterSpacing: 0,
    },
    teamName: {
      color: p.foreground,
      fontSize: 15,
      fontWeight: '900',
      letterSpacing: 0,
    },
    teamNameSelected: {
      color: p.ink,
    },
    teamMeta: {
      color: p.muted,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0,
    },
    teamMetaSelected: {
      color: '#5D4210',
    },
    questionPanel: {
      minHeight: 250,
      justifyContent: 'space-between',
      gap: 16,
      padding: 18,
      borderRadius: 8,
      backgroundColor: p.info,
    },
    darkMeta: {
      color: p.ink,
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 0,
      textTransform: 'uppercase',
    },
    lightMeta: {
      color: p.foreground,
      fontSize: 13,
      fontWeight: '900',
      letterSpacing: 0,
    },
    questionText: {
      color: p.foreground,
      fontSize: 31,
      fontWeight: '900',
      lineHeight: 34,
      letterSpacing: 0,
    },
    lockNote: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 10,
      borderRadius: 8,
      backgroundColor: '#0D0A19AA',
    },
    lockText: {
      color: p.foreground,
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0,
    },
    answerOption: {
      minHeight: 58,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: p.line,
      borderRadius: 8,
      backgroundColor: p.surface,
    },
    answerSelected: {
      backgroundColor: p.accent,
      borderColor: p.accent,
    },
    answerKey: {
      color: p.danger,
      fontSize: 16,
      fontWeight: '900',
      letterSpacing: 0,
    },
    answerKeySelected: {
      color: p.ink,
    },
    answerLabel: {
      color: p.foreground,
      fontSize: 16,
      fontWeight: '800',
      letterSpacing: 0,
    },
    answerLabelSelected: {
      color: p.ink,
      fontWeight: '900',
    },
    podium: {
      minHeight: 176,
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 10,
    },
    podiumCard: {
      flex: 1,
      minHeight: 114,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      borderWidth: 1,
      borderColor: p.line,
      borderRadius: 8,
      backgroundColor: p.surface,
    },
    podiumWinner: {
      minHeight: 176,
      backgroundColor: p.accent,
      borderColor: p.accent,
    },
    podiumRank: {
      fontSize: 24,
      fontWeight: '900',
      letterSpacing: 0,
    },
    podiumName: {
      color: p.foreground,
      fontSize: 13,
      fontWeight: '900',
      letterSpacing: 0,
    },
    podiumPoints: {
      color: p.muted,
      fontSize: 13,
      fontWeight: '900',
      letterSpacing: 0,
    },
    podiumTextDark: {
      color: p.ink,
    },
    sectionTitle: {
      color: p.foreground,
      fontSize: 14,
      fontWeight: '900',
      letterSpacing: 0,
    },
    scoreLogItem: {
      minHeight: 58,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 12,
      borderRadius: 8,
      backgroundColor: p.surface,
    },
    scoreLogLabel: {
      color: p.foreground,
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: 0,
    },
    scoreLogDelta: {
      fontSize: 14,
      fontWeight: '900',
      letterSpacing: 0,
    },
    roomCard: {
      minHeight: 170,
      justifyContent: 'space-between',
      gap: 14,
      padding: 18,
      borderRadius: 8,
      backgroundColor: p.danger,
    },
    metaLabelLight: {
      color: '#FFE4F2',
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 0,
    },
    bigCode: {
      color: p.foreground,
      fontSize: 29,
      fontWeight: '900',
      letterSpacing: 0,
    },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      paddingHorizontal: 9,
      paddingVertical: 7,
      borderRadius: 8,
      backgroundColor: '#0D0A19AA',
    },
    pillDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    pillText: {
      color: p.foreground,
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 0,
    },
    statRow: {
      flexDirection: 'row',
      gap: 8,
      minHeight: 54,
    },
    stat: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
      borderRadius: 8,
      backgroundColor: p.surface,
    },
    statValue: {
      color: p.foreground,
      fontSize: 18,
      fontWeight: '900',
      letterSpacing: 0,
    },
    statLabel: {
      color: p.muted,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0,
    },
    card: {
      gap: 9,
      padding: 14,
      borderWidth: 1,
      borderColor: p.line,
      borderRadius: 8,
      backgroundColor: p.surface,
    },
    cardTitle: {
      color: p.foreground,
      fontSize: 23,
      fontWeight: '900',
      letterSpacing: 0,
    },
    metaLabelAccent: {
      color: p.info,
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 0,
    },
    positiveText: {
      color: p.success,
      fontSize: 13,
      fontWeight: '900',
      letterSpacing: 0,
    },
    roundCard: {
      minHeight: 72,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: p.line,
      borderRadius: 8,
      backgroundColor: p.surface,
    },
    roundSelected: {
      backgroundColor: p.accent,
      borderColor: p.accent,
    },
    roundNumber: {
      color: p.info,
      fontSize: 17,
      fontWeight: '900',
      letterSpacing: 0,
    },
    roundTextSelected: {
      color: p.ink,
    },
    roundTitle: {
      color: p.foreground,
      fontSize: 14,
      fontWeight: '900',
      letterSpacing: 0,
    },
    roundDetail: {
      color: p.muted,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0,
    },
    pointValue: {
      color: p.accent,
      fontSize: 24,
      fontWeight: '900',
      letterSpacing: 0,
    },
    smallButton: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
      backgroundColor: p.ink,
    },
    smallButtonText: {
      color: p.foreground,
      fontSize: 12,
      fontWeight: '900',
      letterSpacing: 0,
    },
    timerCard: {
      minHeight: 122,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
      borderWidth: 1,
      borderColor: p.danger,
      borderRadius: 8,
      backgroundColor: p.surfaceAlt,
    },
    timerText: {
      color: p.foreground,
      fontSize: 44,
      fontWeight: '900',
      letterSpacing: 0,
    },
    timerSubtext: {
      color: '#F7CBE1',
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0,
    },
    secretCard: {
      minHeight: 174,
      justifyContent: 'space-between',
      gap: 10,
      padding: 16,
      borderRadius: 8,
      backgroundColor: p.accent,
    },
    secretWord: {
      color: p.ink,
      fontSize: 30,
      fontWeight: '900',
      letterSpacing: 0,
    },
    forbiddenWord: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
      backgroundColor: p.ink,
    },
    forbiddenText: {
      color: p.accent,
      fontSize: 12,
      fontWeight: '900',
      letterSpacing: 0,
    },
    navWrap: {
      height: 102,
      justifyContent: 'center',
      paddingTop: 12,
      paddingHorizontal: 21,
      paddingBottom: 21,
      backgroundColor: p.background,
    },
    navPill: {
      height: 62,
      flexDirection: 'row',
      gap: 2,
      padding: 4,
      borderWidth: 1,
      borderColor: p.line,
      borderRadius: 36,
      backgroundColor: '#17123A',
    },
    navItem: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
      borderRadius: 26,
    },
    navItemActive: {
      backgroundColor: p.accent,
    },
    navLabel: {
      color: p.muted,
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0,
    },
    navLabelActive: {
      color: p.ink,
      fontWeight: '900',
    },
  });
}
