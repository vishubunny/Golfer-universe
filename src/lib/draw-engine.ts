/**
 * Draw Engine — implements PRD §06.
 *
 * Two strategies produce a 5-number winning combination (range 1-45):
 *   • random       — uniform random distinct picks (lottery-style)
 *   • algorithmic  — weighted by score frequency across the user pool
 *                    (`mode: 'most'` favours most-frequent scores;
 *                     `mode: 'least'` favours least-frequent — admin-configurable)
 *
 * Match calculation: count of winning numbers present in a user's last-5 scores
 * (deduplicated, since one score per date — see PRD §13).
 */

export type DrawLogic = "random" | "algorithmic";
export type AlgoMode = "most" | "least";

export const SCORE_MIN = 1;
export const SCORE_MAX = 45;
export const PICKS = 5;

/** Cryptographically-strong RNG with deterministic fallback for tests. */
function rng(seed?: number) {
  if (seed === undefined) return () => Math.random();
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

/** Random distinct picks across [SCORE_MIN, SCORE_MAX]. */
export function drawRandom(seed?: number): number[] {
  const rand = rng(seed);
  const pool = Array.from({ length: SCORE_MAX - SCORE_MIN + 1 }, (_, i) => i + SCORE_MIN);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, PICKS).sort((a, b) => a - b);
}

/**
 * Algorithmic draw — weighted sampling without replacement.
 * `mode: 'most'`  → weight ∝ frequency
 * `mode: 'least'` → weight ∝ 1 / (frequency + 1)
 */
export function drawAlgorithmic(
  scores: number[],
  mode: AlgoMode = "most",
  seed?: number
): number[] {
  const rand = rng(seed);
  const freq = new Map<number, number>();
  for (let n = SCORE_MIN; n <= SCORE_MAX; n++) freq.set(n, 0);
  for (const s of scores) {
    if (s >= SCORE_MIN && s <= SCORE_MAX) freq.set(s, (freq.get(s) ?? 0) + 1);
  }

  const candidates = Array.from(freq.entries()).map(([n, f]) => ({
    n,
    w: mode === "most" ? f + 1 : 1 / (f + 1) // +1 epsilon so unseen numbers still possible
  }));

  const picks: number[] = [];
  while (picks.length < PICKS && candidates.length) {
    const total = candidates.reduce((acc, c) => acc + c.w, 0);
    let r = rand() * total;
    let idx = 0;
    for (; idx < candidates.length; idx++) {
      r -= candidates[idx].w;
      if (r <= 0) break;
    }
    if (idx >= candidates.length) idx = candidates.length - 1;
    picks.push(candidates[idx].n);
    candidates.splice(idx, 1);
  }
  return picks.sort((a, b) => a - b);
}

/** Run a draw using configured logic. */
export function runDraw(opts: {
  logic: DrawLogic;
  scores?: number[];
  mode?: AlgoMode;
  seed?: number;
}): number[] {
  return opts.logic === "algorithmic"
    ? drawAlgorithmic(opts.scores ?? [], opts.mode ?? "most", opts.seed)
    : drawRandom(opts.seed);
}

/** How many of `userScores` (distinct) appear in `winning`. */
export function countMatches(userScores: number[], winning: number[]): number {
  const w = new Set(winning);
  const u = new Set(userScores);
  let c = 0;
  for (const s of u) if (w.has(s)) c++;
  return c;
}
