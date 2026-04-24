import { describe, it, expect } from "vitest";
import { validateScore, applyRollingFive, distinctScoreValues, ScoreValidationError } from "../src/lib/scores";

describe("scores", () => {
  it("validates score range", () => {
    expect(() => validateScore({ score: 0, played_on: "2026-04-01" })).toThrow(ScoreValidationError);
    expect(() => validateScore({ score: 46, played_on: "2026-04-01" })).toThrow(ScoreValidationError);
    expect(() => validateScore({ score: 25, played_on: "2026-04-01" })).not.toThrow();
  });

  it("rejects future dates", () => {
    expect(() => validateScore({ score: 20, played_on: "9999-01-01" })).toThrow();
  });

  it("rejects duplicate date", () => {
    expect(() =>
      validateScore({ score: 20, played_on: "2026-04-01" }, [{ score: 10, played_on: "2026-04-01" }])
    ).toThrow(/already exists/);
  });

  it("allows update of same id on same date", () => {
    expect(() =>
      validateScore({ id: "x", score: 20, played_on: "2026-04-01" }, [{ id: "x", score: 10, played_on: "2026-04-01" }])
    ).not.toThrow();
  });

  it("rolling-5 keeps newest", () => {
    const scores = [
      { score: 1, played_on: "2026-01-01" },
      { score: 2, played_on: "2026-02-01" },
      { score: 3, played_on: "2026-03-01" },
      { score: 4, played_on: "2026-04-01" },
      { score: 5, played_on: "2026-05-01" },
      { score: 6, played_on: "2026-06-01" }
    ];
    const trimmed = applyRollingFive(scores);
    expect(trimmed).toHaveLength(5);
    expect(trimmed[0].score).toBe(6);
    expect(trimmed.map(s => s.score)).not.toContain(1);
  });

  it("distinct values dedups", () => {
    expect(distinctScoreValues([
      { score: 1, played_on: "2026-01-01" },
      { score: 1, played_on: "2026-02-01" },
      { score: 2, played_on: "2026-03-01" }
    ]).sort()).toEqual([1, 2]);
  });
});
