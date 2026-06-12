import type { paths } from "../../generated/api-types";

type JsonResponse<
  Path extends keyof paths,
  Method extends keyof paths[Path],
  Status extends number,
> =
  NonNullable<paths[Path][Method]> extends {
    responses: infer Responses;
  }
    ? Status extends keyof Responses
      ? Responses[Status] extends {
          content: { "application/json": infer Body };
        }
        ? Body
        : never
      : never
    : never;

type JsonRequestBody<
  Path extends keyof paths,
  Method extends keyof paths[Path],
> =
  NonNullable<paths[Path][Method]> extends {
    requestBody?: infer RequestBody;
  }
    ? NonNullable<RequestBody> extends {
        content: { "application/json": infer Body };
      }
      ? Body
      : never
    : never;

type GamesResponse = JsonResponse<"/v1/games", "get", 200>;

const games: GamesResponse = [
  {
    id: "gd_trivia",
    slug: "trivia",
    name: "Trivia",
    description: "Answer questions.",
    type: "TRIVIA",
    defaultConfig: { questionsPerRound: 10 },
    isBuiltIn: true,
  },
];

type QueueRoundRequest = JsonRequestBody<
  "/v1/parties/{joinCode}/rounds",
  "post"
>;

const queueTriviaRound: QueueRoundRequest = {
  gameSlug: "trivia",
  config: {
    questionsPerRound: 5,
    secondsPerQuestion: 20,
    categories: ["Science"],
    difficultyMin: 1,
    difficultyMax: 4,
  },
};

const queueTabooRound: QueueRoundRequest = {
  gameSlug: "taboo",
  config: {
    secondsPerTurn: 60,
    cardsPerTurn: 20,
    forbiddenWordPenalty: 50,
  },
};

type SavePlanRequest = JsonRequestBody<"/v1/plans", "post">;

const savePlan: SavePlanRequest = {
  name: "Friday games",
  rounds: [
    {
      gameSlug: "charades",
      notes: "Warm-up round",
      config: {
        phrasesPerTurn: 10,
        maxSkipsPerTurn: 3,
      },
    },
    {
      gameSlug: "custom-game",
      config: {
        hostJudged: true,
      },
    },
  ],
};

type CreatePeriodRequest = JsonRequestBody<"/v1/periods", "post">;
type PeriodListResponse = JsonResponse<"/v1/periods", "get", 200>;
type CreatePartyRequest = JsonRequestBody<"/v1/parties", "post">;

const createPeriod: CreatePeriodRequest = {
  name: "Summer League",
  maxTeams: 4,
  teamCapacity: 8,
};

const periods: PeriodListResponse = [
  {
    id: "period_1",
    hostId: "host_1",
    name: "Summer League",
    status: "ACTIVE",
    startsAt: null,
    endsAt: null,
    maxTeams: 4,
    teamCapacity: 8,
    settings: {},
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    teamCount: 4,
    partyCount: 2,
  },
];

const createLinkedParty: CreatePartyRequest = {
  name: "Week Three",
  periodId: "period_1",
};

void [
  games,
  queueTriviaRound,
  queueTabooRound,
  savePlan,
  createPeriod,
  periods,
  createLinkedParty,
];
