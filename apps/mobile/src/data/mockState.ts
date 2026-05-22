import type {
  BonusAwardSummary,
  PeriodSummary,
  QueuedRoundSummary,
  ScoreEventSummary,
  TeamSummary,
} from '../types/product';

export const joinCode = 'LUCKY7';

export const period: PeriodSummary = {
  id: 'period-gregs-house',
  name: "Greg's House League",
  weekLabel: 'Week 2 of 4',
  capacityLabel: '8 per team',
  locationVerificationStatus: 'verified',
};

export const teams: TeamSummary[] = [
  {
    id: 'team-neon-noodles',
    name: 'Neon Noodles',
    shortName: 'N',
    checkedIn: 8,
    capacity: 8,
    points: 1340,
    color: '#FFCB45',
    isSelected: true,
  },
  {
    id: 'team-pixel-pirates',
    name: 'Pixel Pirates',
    shortName: 'P',
    checkedIn: 6,
    capacity: 8,
    points: 1110,
    color: '#FF4FA3',
  },
  {
    id: 'team-quiz-queens',
    name: 'Quiz Queens',
    shortName: 'Q',
    checkedIn: 5,
    capacity: 8,
    points: 980,
    color: '#3DF5D8',
  },
];

export const scoreEvents: ScoreEventSummary[] = [
  {
    id: 'score-fast-answer',
    label: 'Fast answer',
    delta: 170,
    teamName: 'Neon Noodles',
    source: 'engine',
  },
  {
    id: 'score-correction',
    label: 'Correction: wrong team award',
    delta: -100,
    teamName: 'Pixel Pirates',
    source: 'correction',
  },
  {
    id: 'score-bonus',
    label: 'Bonus: most vibrant table',
    delta: 75,
    teamName: 'Quiz Queens',
    source: 'bonus',
  },
];

export const bonusAwards: BonusAwardSummary[] = [
  {
    id: 'bonus-best-dressed',
    label: 'Best dressed',
    points: 100,
    reason: 'Theme fit, effort, crowd reaction',
  },
  {
    id: 'bonus-most-vibrant',
    label: 'Most vibrant',
    points: 75,
    reason: 'Energy, chants, room presence',
  },
];

export const queuedRounds: QueuedRoundSummary[] = [
  {
    id: 'round-trivia',
    order: 1,
    label: 'Trivia: Hot Seat',
    detail: 'Questions on TV + phones',
    points: 600,
    kind: 'trivia',
  },
  {
    id: 'round-charades',
    order: 2,
    label: 'Charades: Panic Mime',
    detail: 'Host-only prompt',
    points: 500,
    kind: 'charades',
  },
  {
    id: 'round-custom',
    order: 3,
    label: 'Custom: Word Scramble',
    detail: 'Manual scoring + score log',
    points: 650,
    kind: 'custom',
  },
];
