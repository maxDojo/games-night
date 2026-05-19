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

void [games, queueTriviaRound, queueTabooRound, savePlan];
