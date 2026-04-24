/**
 * Score helpers — implements PRD §05 + §13 client/server-side guards.
 *
 * DB trigger `trim_scores_to_five` is the hard enforcer of rolling-5;
 * these helpers provide the same logic for previews/optimistic UI.
 */
import { SCORE_MIN, SCORE_MAX } from "./draw-engine";

export interface ScoreEntry {
  id?: string;
  score: number;
  played_on: string; // ISO yyyy-mm-dd
}

export class ScoreValidationError extends Error {}

export function validateScore(entry: ScoreEntry, existing: ScoreEntry[] = []): void {
  if (!Number.isInteger(entry.score) || entry.score < SCORE_MIN || entry.score > SCORE_MAX) {
    throw new ScoreValidationError(`Score must be an integer between ${SCORE_MIN} and ${SCORE_MAX}.`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.played_on)) {
    throw new ScoreValidationError("Date must be in YYYY-MM-DD format.");
  }
  const date = new Date(entry.played_on);
  if (Number.isNaN(date.getTime())) throw new ScoreValidationError("Invalid date.");
  if (date.getTime() > Date.now() + 24 * 3600 * 1000) {
    throw new ScoreValidationError("Date cannot be in the future.");
  }
  // PRD §13: only one entry per date
  if (existing.some((e) => e.played_on === entry.played_on && (!entry.id || e.id !== entry.id))) {
    throw new ScoreValidationError("A score already exists for this date — edit or delete it instead.");
  }
}

/** Apply rolling-5 logic locally for previews. Newest first; oldest dropped. */
export function applyRollingFive(scores: ScoreEntry[]): ScoreEntry[] {
  return [...scores]
    .sort((a, b) => (a.played_on < b.played_on ? 1 : -1))
    .slice(0, 5);
}

/** Distinct numeric scores (used by draw-match logic). */
export function distinctScoreValues(scores: ScoreEntry[]): number[] {
  return Array.from(new Set(scores.map((s) => s.score)));
}
