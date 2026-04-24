"use client";
/**
 * Client-side Supabase-compatible shim. Sends serialized queries to /api/sb,
 * proxies auth to /api/auth/*, and uploads files to /api/storage/upload.
 */
import { createBuilderFactory, type Result, type SerializedQuery } from "@/lib/sb-builder";

async function runRemote(q: SerializedQuery): Promise<Result> {
  try {
    const res = await fetch("/api/sb", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(q)
    });
    const json = await res.json();
    if (!res.ok) return { data: null, error: { message: json.error ?? `HTTP ${res.status}` } };
    return json as Result;
  } catch (e: any) {
    return { data: null, error: { message: e.message ?? "Network error" } };
  }
}

export function createClient() {
  const from = createBuilderFactory(runRemote);
  return {
    from,
    auth: {
      async getUser() {
        try {
          const res = await fetch("/api/auth/me", { credentials: "same-origin" });
          const json = await res.json();
          return { data: { user: json.user }, error: null };
        } catch (e: any) { return { data: { user: null }, error: { message: e.message } }; }
      },
      async signInWithPassword({ email, password }: { email: string; password: string }) {
        const res = await fetch("/api/auth/login", {
          method: "POST", headers: { "Content-Type": "application/json" },
          credentials: "same-origin", body: JSON.stringify({ email, password })
        });
        const json = await res.json();
        if (!res.ok) return { data: null, error: { message: json.error ?? "Login failed" } };
        return { data: { user: json.user }, error: null };
      },
      async signUp({ email, password, options }: { email: string; password: string; options?: { data?: { full_name?: string }; [k: string]: any } }) {
        const res = await fetch("/api/auth/signup", {
          method: "POST", headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ email, password, full_name: options?.data?.full_name })
        });
        const json = await res.json();
        if (!res.ok) return { data: null, error: { message: json.error ?? "Signup failed" } };
        return { data: { user: json.user }, error: null };
      },
      async signOut() {
        await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
        return { error: null };
      }
    },
    storage: {
      from(bucket: string) {
        return {
          async upload(path: string, file: File) {
            try {
              const fd = new FormData();
              fd.append("file", file);
              fd.append("bucket", bucket);
              fd.append("path", path);
              const res = await fetch("/api/storage/upload", { method: "POST", credentials: "same-origin", body: fd });
              const json = await res.json();
              if (!res.ok) return { data: null, error: { message: json.error ?? "Upload failed" } };
              return { data: { path: json.path }, error: null };
            } catch (e: any) {
              return { data: null, error: { message: e.message ?? "Upload failed" } };
            }
          }
        };
      }
    }
  };
}

