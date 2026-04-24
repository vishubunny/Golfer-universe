/**
 * Prize Pool calculator — implements PRD §07.
 *
 *   5-Number Match → 40 % (rolls over if no winner — jackpot)
 *   4-Number Match → 35 %
 *   3-Number Match → 25 %
 *
 * • Pool is built from a fixed share of subscription revenue.
 * • Each tier is split equally among that tier's winners.
 * • If 5-match has no winners, that tier amount carries to next month.
 */

export const POOL_SHARE = { five: 0.4, four: 0.35, three: 0.25 } as const;

/** Share of a subscription contributing to the prize pool (post-charity). */
export const POOL_CONTRIBUTION_RATE = 0.5; // 50 % of subscription → prize pool

export interface PoolInput {
  /** Total active subscription revenue this period (cents). */
  totalSubscriptionCents: number;
  /** Average charity percentage withdrawn from pool eligibility (e.g. 10 = 10 %). */
  avgCharityPct: number;
  /** Carry-over jackpot from previous month (cents). */
  jackpotCarryCents?: number;
}

export interface PoolBreakdown {
  totalPoolCents: number;
  fiveCents: number;
  fourCents: number;
  threeCents: number;
  jackpotCarryCents: number;
}

export function calculatePool(input: PoolInput): PoolBreakdown {
  const charityFactor = Math.max(0, Math.min(100, input.avgCharityPct)) / 100;
  const afterCharity = Math.floor(input.totalSubscriptionCents * (1 - charityFactor));
  const totalPoolCents = Math.floor(afterCharity * POOL_CONTRIBUTION_RATE);
  const carry = Math.max(0, input.jackpotCarryCents ?? 0);

  return {
    totalPoolCents,
    fiveCents: Math.floor(totalPoolCents * POOL_SHARE.five) + carry,
    fourCents: Math.floor(totalPoolCents * POOL_SHARE.four),
    threeCents: Math.floor(totalPoolCents * POOL_SHARE.three),
    jackpotCarryCents: carry
  };
}

export interface DistributionInput {
  pool: PoolBreakdown;
  fiveWinners: number;
  fourWinners: number;
  threeWinners: number;
}

export interface DistributionResult {
  perFiveCents: number;
  perFourCents: number;
  perThreeCents: number;
  /** New jackpot carry for next month if no 5-winner. */
  newJackpotCarryCents: number;
}

export function distributePrizes(input: DistributionInput): DistributionResult {
  const { pool, fiveWinners, fourWinners, threeWinners } = input;

  const perFiveCents = fiveWinners > 0 ? Math.floor(pool.fiveCents / fiveWinners) : 0;
  const perFourCents = fourWinners > 0 ? Math.floor(pool.fourCents / fourWinners) : 0;
  const perThreeCents = threeWinners > 0 ? Math.floor(pool.threeCents / threeWinners) : 0;

  // Jackpot rolls over only if no 5-match winner
  const newJackpotCarryCents = fiveWinners === 0 ? pool.fiveCents : 0;

  return { perFiveCents, perFourCents, perThreeCents, newJackpotCarryCents };
}
