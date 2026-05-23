export type PlayerRoute = 'check-in' | 'answer' | 'report';

export type PlayerTabRoute = Exclude<PlayerRoute, 'check-in'>;

export type HostRoute = 'lobby' | 'queue' | 'stage' | 'teams';

export type TriviaDisplayMode = 'shared_screen_only' | 'player_devices' | 'both';

export interface TeamSummary {
  id: string;
  name: string;
  shortName: string;
  checkedIn: number;
  capacity: number;
  points: number;
  color: string;
  isSelected?: boolean;
}

export interface PeriodSummary {
  id: string;
  name: string;
  weekLabel: string;
  capacityLabel: string;
  locationVerificationStatus: 'not_required' | 'verified' | 'failed' | 'overridden';
}

export interface ScoreEventSummary {
  id: string;
  label: string;
  delta: number;
  teamName: string;
  source: 'engine' | 'manual' | 'correction' | 'penalty' | 'bonus';
}

export interface QueuedRoundSummary {
  id: string;
  order: number;
  label: string;
  detail: string;
  points: number;
  kind: 'trivia' | 'charades' | 'taboo' | 'custom';
}

export interface BonusAwardSummary {
  id: string;
  label: string;
  points: number;
  reason: string;
}

export interface PlayerRoundStatus {
  id: string;
  order: number;
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'SKIPPED';
  label: string;
  detail: string;
  gameSlug?: string | null;
}
