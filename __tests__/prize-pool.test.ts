import { describe, it, expect } from "vitest";
import { calculatePool, distributePrizes, POOL_SHARE, POOL_CONTRIBUTION_RATE } from "../src/lib/prize-pool";

describe("prize-pool", () => {
  it("calculates pool with charity withholding", () => {
    const p = calculatePool({ totalSubscriptionCents: 100_000, avgCharityPct: 10 });
    // 100000 * 0.9 (charity) * 0.5 (pool rate) = 45000
    expect(p.totalPoolCents).toBe(45_000);
    expect(p.fiveCents).toBe(Math.floor(45_000 * POOL_SHARE.five));
    expect(p.fourCents).toBe(Math.floor(45_000 * POOL_SHARE.four));
    expect(p.threeCents).toBe(Math.floor(45_000 * POOL_SHARE.three));
  });

  it("adds jackpot carry to 5-match tier", () => {
    const p = calculatePool({ totalSubscriptionCents: 100_000, avgCharityPct: 10, jackpotCarryCents: 12_345 });
    expect(p.jackpotCarryCents).toBe(12_345);
    expect(p.fiveCents).toBe(Math.floor(45_000 * POOL_SHARE.five) + 12_345);
  });

  it("rolls jackpot when no 5-match winners", () => {
    const pool = calculatePool({ totalSubscriptionCents: 200_000, avgCharityPct: 15 });
    const dist = distributePrizes({ pool, fiveWinners: 0, fourWinners: 2, threeWinners: 5 });
    expect(dist.perFiveCents).toBe(0);
    expect(dist.newJackpotCarryCents).toBe(pool.fiveCents);
    expect(dist.perFourCents).toBe(Math.floor(pool.fourCents / 2));
    expect(dist.perThreeCents).toBe(Math.floor(pool.threeCents / 5));
  });

  it("does not roll jackpot when 5-match winners exist", () => {
    const pool = calculatePool({ totalSubscriptionCents: 200_000, avgCharityPct: 10 });
    const dist = distributePrizes({ pool, fiveWinners: 1, fourWinners: 0, threeWinners: 0 });
    expect(dist.newJackpotCarryCents).toBe(0);
    expect(dist.perFiveCents).toBe(pool.fiveCents);
  });

  it("contribution rate constant matches expected behaviour", () => {
    expect(POOL_CONTRIBUTION_RATE).toBeGreaterThan(0);
    expect(POOL_CONTRIBUTION_RATE).toBeLessThanOrEqual(1);
  });
});
