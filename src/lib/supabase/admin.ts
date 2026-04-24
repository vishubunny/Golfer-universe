/**
 * Service-role-equivalent client. SERVER ONLY — bypasses any auth checks (used
 * for cron jobs and webhook handlers that already self-authenticate).
 */
import { createBuilderFactory } from "@/lib/sb-builder";
import { execQuery } from "@/lib/sb-shim";

export function createAdminClient() {
  const from = createBuilderFactory(async (q) => execQuery(q));
  return { from };
}

