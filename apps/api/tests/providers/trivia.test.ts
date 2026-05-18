import { describe, it, expect, vi } from 'vitest';
import {
  createOpenTriviaDbProvider,
  decodeHtmlEntities,
} from '../../src/providers/trivia/open-trivia-db.js';
import { createNoneTriviaProvider } from '../../src/providers/trivia/none.js';
import { createTriviaProvider } from '../../src/providers/trivia/index.js';

describe('decodeHtmlEntities', () => {
  it('decodes named entities Open Trivia DB emits', () => {
    expect(decodeHtmlEntities('Tom &amp; Jerry')).toBe('Tom & Jerry');
    expect(decodeHtmlEntities('&quot;hello&quot;')).toBe('"hello"');
    expect(decodeHtmlEntities("don&#039;t")).toBe("don't");
    expect(decodeHtmlEntities('caf&eacute;')).toBe('café');
  });

  it('decodes numeric and hex entities', () => {
    expect(decodeHtmlEntities('&#8211;')).toBe('–');
    expect(decodeHtmlEntities('&#x2014;')).toBe('—');
  });

  it('leaves untouched strings untouched', () => {
    expect(decodeHtmlEntities('plain text')).toBe('plain text');
  });
});

describe('createOpenTriviaDbProvider', () => {
  function mockResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  }

  it('fetches and transforms a batch', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      mockResponse({
        response_code: 0,
        results: [
          {
            category: 'Science',
            type: 'multiple',
            difficulty: 'medium',
            question: 'Tom &amp; Jerry are which species?',
            correct_answer: 'Cat and mouse',
            incorrect_answers: ['Dog and cat', 'Bird and fish', 'Wolf and rabbit'],
          },
          {
            category: 'History',
            type: 'multiple',
            difficulty: 'easy',
            question: 'Caf&eacute; was invented where?',
            correct_answer: 'Ethiopia',
            incorrect_answers: ['Italy', 'France', 'Brazil'],
          },
        ],
      }),
    );
    const sleepMs = vi.fn().mockResolvedValue(undefined);

    const provider = createOpenTriviaDbProvider({ fetchImpl, sleepMs });
    const out = await provider.fetchQuestions(2);

    expect(out).toHaveLength(2);
    expect(out[0]!.question).toBe('Tom & Jerry are which species?');
    expect(out[0]!.difficulty).toBe(3); // medium → 3
    expect(out[1]!.question).toBe('Café was invented where?');
    expect(out[1]!.difficulty).toBe(1); // easy → 1
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it('chunks requests above the 50-per-call limit and respects the rate-limit gap', async () => {
    const oneResult = (i: number) => ({
      category: 'X',
      type: 'multiple' as const,
      difficulty: 'hard' as const,
      question: `Q${i}`,
      correct_answer: 'A',
      incorrect_answers: ['B', 'C', 'D'],
    });
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        mockResponse({ response_code: 0, results: Array.from({ length: 50 }, (_, i) => oneResult(i)) }),
      )
      .mockResolvedValueOnce(
        mockResponse({ response_code: 0, results: Array.from({ length: 10 }, (_, i) => oneResult(50 + i)) }),
      );
    const sleepMs = vi.fn().mockResolvedValue(undefined);

    const provider = createOpenTriviaDbProvider({ fetchImpl, sleepMs });
    const out = await provider.fetchQuestions(60);

    expect(out).toHaveLength(60);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    // One inter-batch sleep (between the two requests). No trailing sleep.
    expect(sleepMs).toHaveBeenCalledTimes(1);
  });

  it('retries once on response_code=5 (rate-limited), then succeeds', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(mockResponse({ response_code: 5, results: [] }))
      .mockResolvedValueOnce(
        mockResponse({
          response_code: 0,
          results: [
            {
              category: 'X',
              type: 'multiple',
              difficulty: 'easy',
              question: 'Q',
              correct_answer: 'A',
              incorrect_answers: ['B', 'C', 'D'],
            },
          ],
        }),
      );
    const sleepMs = vi.fn().mockResolvedValue(undefined);

    const provider = createOpenTriviaDbProvider({ fetchImpl, sleepMs });
    const out = await provider.fetchQuestions(1);

    expect(out).toHaveLength(1);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sleepMs).toHaveBeenCalled();
  });

  it('throws on non-2xx responses', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('boom', { status: 503 }));
    const provider = createOpenTriviaDbProvider({ fetchImpl, sleepMs: async () => undefined });
    await expect(provider.fetchQuestions(1)).rejects.toThrow(/HTTP 503/);
  });

  it('returns empty array when asked for zero questions', async () => {
    const fetchImpl = vi.fn();
    const provider = createOpenTriviaDbProvider({ fetchImpl });
    expect(await provider.fetchQuestions(0)).toEqual([]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('propagates difficulty and category as query params', async () => {
    const oneQ = {
      category: 'X',
      type: 'multiple' as const,
      difficulty: 'easy' as const,
      question: 'Q',
      correct_answer: 'A',
      incorrect_answers: ['B', 'C', 'D'],
    };
    const fetchImpl = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(
          mockResponse({ response_code: 0, results: Array.from({ length: 5 }, () => oneQ) }),
        ),
      );
    const provider = createOpenTriviaDbProvider({ fetchImpl, sleepMs: async () => undefined });
    await provider.fetchQuestions(5, { difficulty: 'hard', category: 9 });
    const url = fetchImpl.mock.calls[0]![0] as string;
    expect(url).toContain('difficulty=hard');
    expect(url).toContain('category=9');
    expect(url).toContain('amount=5');
  });

  it('breaks out of the loop when the API returns fewer than requested', async () => {
    const oneQ = {
      category: 'X',
      type: 'multiple' as const,
      difficulty: 'easy' as const,
      question: 'Q',
      correct_answer: 'A',
      incorrect_answers: ['B', 'C', 'D'],
    };
    // First call returns 1, second returns 0 → loop must terminate.
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(mockResponse({ response_code: 0, results: [oneQ] }))
      .mockResolvedValueOnce(mockResponse({ response_code: 0, results: [] }));
    const provider = createOpenTriviaDbProvider({ fetchImpl, sleepMs: async () => undefined });
    const out = await provider.fetchQuestions(60);
    expect(out).toHaveLength(1);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});

describe('createNoneTriviaProvider', () => {
  it('is marked disabled and throws a helpful error when called', async () => {
    const p = createNoneTriviaProvider();
    expect(p.enabled).toBe(false);
    expect(p.name).toBe('none');
    await expect(p.fetchQuestions(1)).rejects.toThrow(/none/);
  });
});

describe('createTriviaProvider factory', () => {
  it("returns the Open Trivia DB impl when kind='open-trivia-db'", () => {
    const p = createTriviaProvider('open-trivia-db');
    expect(p.name).toBe('open-trivia-db');
    expect(p.enabled).toBe(true);
  });
  it("returns the none impl when kind='none'", () => {
    const p = createTriviaProvider('none');
    expect(p.name).toBe('none');
    expect(p.enabled).toBe(false);
  });
});
