import type { FetchQuestionsOptions, TriviaProvider, TriviaQuestion } from './types.js';

// Open Trivia DB (https://opentdb.com) — free, CC-BY-SA, no API key.
// Rate limit: 1 request per IP per 5 seconds. We chunk by 50 (their max per call)
// and back off on the rate-limit response code.
//
// Response shape (relevant parts):
//   { response_code: 0, results: [{ category, type, difficulty,
//                                   question, correct_answer, incorrect_answers }] }
//
// response_code reference:
//   0 = success, 1 = no results, 2 = invalid param, 3 = token not found,
//   4 = token empty, 5 = rate limit.

interface OpenTriviaRawResult {
  category: string;
  type: 'multiple' | 'boolean';
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
}

interface OpenTriviaRawResponse {
  response_code: number;
  results: OpenTriviaRawResult[];
}

const MAX_PER_REQUEST = 50;
const RATE_LIMIT_BACKOFF_MS = 5_500;

// Minimal HTML-entity decoder for the entities Open Trivia DB emits.
// (Avoids pulling in a library for a tiny fixed alphabet.)
const ENTITY_MAP: Record<string, string> = {
  '&quot;': '"',
  '&#039;': "'",
  '&apos;': "'",
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&eacute;': 'é',
  '&Eacute;': 'É',
  '&shy;': '',
  '&hellip;': '…',
  '&ndash;': '–',
  '&mdash;': '—',
  '&rsquo;': '’',
  '&lsquo;': '‘',
  '&ldquo;': '“',
  '&rdquo;': '”',
};

export function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&[a-zA-Z]+;/g, (m) => ENTITY_MAP[m] ?? m);
}

function mapDifficulty(d: 'easy' | 'medium' | 'hard'): 1 | 3 | 5 {
  return d === 'easy' ? 1 : d === 'medium' ? 3 : 5;
}

interface OpenTriviaDbOptions {
  baseUrl?: string;
  /** Injected for tests. Defaults to global fetch. */
  fetchImpl?: typeof fetch;
  /** Injected for tests so we don't sleep for real. */
  sleepMs?: (ms: number) => Promise<void>;
}

export function createOpenTriviaDbProvider(opts: OpenTriviaDbOptions = {}): TriviaProvider {
  const baseUrl = opts.baseUrl ?? 'https://opentdb.com';
  const doFetch = opts.fetchImpl ?? fetch;
  const sleep = opts.sleepMs ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));

  async function fetchBatch(amount: number, o?: FetchQuestionsOptions): Promise<TriviaQuestion[]> {
    const params = new URLSearchParams({ amount: String(amount), type: 'multiple' });
    if (o?.difficulty) params.set('difficulty', o.difficulty);
    if (o?.category !== undefined) params.set('category', String(o.category));

    const url = `${baseUrl}/api.php?${params.toString()}`;
    const res = await doFetch(url);
    if (!res.ok) throw new Error(`Open Trivia DB request failed: HTTP ${res.status}`);
    const json = (await res.json()) as OpenTriviaRawResponse;

    if (json.response_code === 5) {
      // Rate limited — wait and retry once.
      await sleep(RATE_LIMIT_BACKOFF_MS);
      const retry = await doFetch(url);
      const retryJson = (await retry.json()) as OpenTriviaRawResponse;
      if (retryJson.response_code !== 0)
        throw new Error(`Open Trivia DB rate-limited (response_code=${retryJson.response_code})`);
      return retryJson.results.map(transform);
    }
    if (json.response_code !== 0)
      throw new Error(`Open Trivia DB error (response_code=${json.response_code})`);
    return json.results.map(transform);
  }

  function transform(r: OpenTriviaRawResult): TriviaQuestion {
    return {
      question: decodeHtmlEntities(r.question),
      correctAnswer: decodeHtmlEntities(r.correct_answer),
      incorrectAnswers: r.incorrect_answers.map(decodeHtmlEntities),
      category: r.category,
      difficulty: mapDifficulty(r.difficulty),
    };
  }

  return {
    name: 'open-trivia-db',
    enabled: true,
    async fetchQuestions(count, options) {
      if (count <= 0) return [];
      const out: TriviaQuestion[] = [];
      let remaining = count;
      while (remaining > 0) {
        const batchSize = Math.min(remaining, MAX_PER_REQUEST);
        const batch = await fetchBatch(batchSize, options);
        // Defensive: if the API returns fewer than asked (or zero), don't loop forever.
        if (batch.length === 0) break;
        out.push(...batch);
        remaining -= batch.length;
        if (remaining > 0) await sleep(RATE_LIMIT_BACKOFF_MS);
      }
      return out;
    },
  };
}
