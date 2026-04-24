/**
 * Server-side Supabase-compatible client backed by SQLite + JWT cookie auth.
 * Used in server components, API routes, and the dashboard/admin layouts.
 */
import { createBuilderFactory } from "@/lib/sb-builder";
import { execQuery } from "@/lib/sb-shim";
import { getServerUser, signupUser, loginUser, clearSessionCookie } from "@/lib/auth";

export function createClient() {
  const from = createBuilderFactory(async (q) => execQuery(q));
  return {
    from,
    auth: {
      async getUser() {
        const u = await getServerUser();
        return { data: { user: u ? { id: u.id, email: u.email, user_metadata: {} } : null }, error: null };
      },
      async signInWithPassword({ email, password }: { email: string; password: string }) {
        const r = await loginUser(email, password);
        return { data: r.user ? { user: { id: r.user.id, email: r.user.email } } : null, error: r.error ? { message: r.error } : null };
      },
      async signUp({ email, password, options }: { email: string; password: string; options?: { data?: { full_name?: string }; [k: string]: any } }) {
        const r = await signupUser(email, password, options?.data?.full_name);
        return { data: r.user ? { user: { id: r.user.id, email: r.user.email } } : null, error: r.error ? { message: r.error } : null };
      },
      async signOut() { clearSessionCookie(); return { error: null }; }
    },
    storage: {
      from(_bucket: string) {
        return {
          async upload(_path: string, _file: any) {
            return { data: null, error: { message: "Storage upload not supported on server-side shim" } };
          }
        };
      }
    }
  };
}

