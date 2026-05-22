export type PlayerRoute = 'check-in' | 'answer' | 'standings';

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
  source: 'engine' | 'manual' | 'correction' | 'penalty';
}

export interface QueuedRoundSummary {
  id: string;
  order: number;
  label: string;
  detail: string;
  points: number;
  kind: 'trivia' | 'charades' | 'taboo' | 'custom';
}
