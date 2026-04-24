import { describe, it, expect } from "vitest";
import { drawRandom, drawAlgorithmic, countMatches, runDraw, PICKS, SCORE_MIN, SCORE_MAX } from "../src/lib/draw-engine";

describe("draw-engine", () => {
  it("random draw returns 5 distinct numbers in range", () => {
    for (let i = 0; i < 100; i++) {
      const w = drawRandom();
      expect(w).toHaveLength(PICKS);
      expect(new Set(w).size).toBe(PICKS);
      w.forEach(n => { expect(n).toBeGreaterThanOrEqual(SCORE_MIN); expect(n).toBeLessThanOrEqual(SCORE_MAX); });
    }
  });

  it("seeded random is deterministic", () => {
    expect(drawRandom(42)).toEqual(drawRandom(42));
  });

  it("algorithmic 'most' favours frequent values", () => {
    const scores = Array(500).fill(7).concat(Array(500).fill(13)); // huge bias to 7,13
    let hits = 0;
    for (let i = 0; i < 200; i++) {
      const w = drawAlgorithmic(scores, "most");
      if (w.includes(7) || w.includes(13)) hits++;
    }
    expect(hits).toBeGreaterThan(180); // should be near-ubiquitous
  });

  it("algorithmic produces distinct picks", () => {
    const w = drawAlgorithmic([1, 2, 3, 4, 5, 1, 1], "most", 99);
    expect(new Set(w).size).toBe(PICKS);
  });

  it("countMatches counts intersect of distinct user scores with winning", () => {
    expect(countMatches([1, 2, 3, 4, 5], [1, 2, 6, 7, 8])).toBe(2);
    expect(countMatches([1, 1, 1], [1, 2, 3, 4, 5])).toBe(1); // dedup
    expect(countMatches([], [1, 2, 3, 4, 5])).toBe(0);
  });

  it("runDraw dispatches strategy", () => {
    expect(runDraw({ logic: "random", seed: 1 })).toHaveLength(PICKS);
    expect(runDraw({ logic: "algorithmic", scores: [10, 20], seed: 1 })).toHaveLength(PICKS);
  });
});
