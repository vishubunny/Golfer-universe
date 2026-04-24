// Stripe is disabled in local mode (mock checkout used instead). This stub
// preserves the import so any straggler references type-check, but is unused.
export const stripe: any = null;
export const PRICE_IDS = { monthly: "mock_monthly", yearly: "mock_yearly" } as const;

