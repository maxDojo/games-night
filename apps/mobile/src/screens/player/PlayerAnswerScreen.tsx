import { Text, View } from 'react-native';
import { CheckCircle2, Clock, EyeOff, Lock, Radio, ShieldCheck } from 'lucide-react-native';

import { AnswerOption } from '../../components/game/AnswerOption';
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
    submitTriviaAnswer,
    triviaError,
    triviaQuestion,
    triviaReveal,
    triviaSelectedChoice,
    triviaSubmittedChoice,
  } = usePartyState();
  const activeRound = currentRound ?? nextRound;
  const isActiveTrivia = currentRound?.gameSlug === 'trivia';
  const activeTriviaQuestion = isActiveTrivia && triviaQuestion?.roundId === currentRound.id ? triviaQuestion : undefined;
  const activeReveal =
    activeTriviaQuestion && triviaReveal?.promptId === activeTriviaQuestion.promptId ? triviaReveal : undefined;
  const answerLocked = Boolean(triviaSubmittedChoice || activeReveal);
  const selectedChoice = triviaSelectedChoice ?? triviaSubmittedChoice ?? activeReveal?.selectedChoice;
  const statusTitle = activeTriviaQuestion
    ? `Question ${activeTriviaQuestion.questionNumber}`
    : currentRound
      ? `${currentRound.label} is live`
      : 'Waiting for host';
  const statusSubtitle = currentRound
    ? isActiveTrivia
      ? activeTriviaQuestion
        ? 'Choose once. First answer from your team is the one that counts.'
        : 'Trivia is live. Waiting for the next question from the host.'
      : 'You are in the room. Watch for the host prompt.'
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

      {activeTriviaQuestion ? (
        <>
          <View style={styles.questionPanel}>
            <View style={styles.rowBetween}>
              <Text style={styles.darkMeta}>
                {activeTriviaQuestion.questionNumber}/{activeTriviaQuestion.total}
              </Text>
              <Text style={styles.lightMeta}>{answerLocked ? 'locked' : 'pick one'}</Text>
            </View>
            <Text style={styles.questionText}>{activeTriviaQuestion.question}</Text>
            <View style={styles.lockNote}>
              <Lock color={theme.palette.accent} size={15} />
              <Text style={styles.lockText}>Live scores stay hidden until the host reveal.</Text>
            </View>
          </View>

          <View style={styles.stack}>
            {activeTriviaQuestion.choices.map((choice, index) => (
              <AnswerOption
                key={`${index}-${choice}`}
                keyLabel={String.fromCharCode(65 + index)}
                label={choice}
                selected={choice === selectedChoice}
                disabled={answerLocked}
                onPress={() => submitTriviaAnswer(choice)}
              />
            ))}
          </View>

          {activeReveal ? (
            <InfoBanner
              icon={CheckCircle2}
              title={activeReveal.wasCorrect ? 'Answer confirmed' : 'Answer revealed'}
              subtitle={`Correct answer: ${activeReveal.correctAnswer}`}
              color={activeReveal.wasCorrect ? theme.palette.success : theme.palette.info}
            />
          ) : triviaSubmittedChoice ? (
            <InfoBanner
              icon={ShieldCheck}
              title="Answer locked"
              subtitle="Your team answer has been sent. Results stay sealed here."
              color={theme.palette.success}
            />
          ) : triviaError ? (
            <Text style={styles.errorText}>{triviaError}</Text>
          ) : null}
        </>
      ) : null}

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
