"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next") ?? "/dashboard";
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null); const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setErr(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setErr(error.message);
    router.push(next); router.refresh();
  }
  return (
    <form onSubmit={submit} className="space-y-4 glass p-6">
      <div><label className="label">Email</label><input className="input" type="email" required value={email} onChange={e => setEmail(e.target.value)} /></div>
      <div><label className="label">Password</label><input className="input" type="password" required value={password} onChange={e => setPassword(e.target.value)} /></div>
      {err && <p className="text-red-400 text-sm">{err}</p>}
      <button className="btn-primary w-full" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="max-w-md mx-auto px-6 py-20">
      <h1 className="text-3xl font-bold mb-2">Welcome back</h1>
      <p className="text-muted mb-8">Sign in to manage your scores and draws.</p>
      <Suspense fallback={<div className="glass p-6">Loading…</div>}>
        <LoginForm />
      </Suspense>
      <p className="text-sm text-muted mt-4 text-center">No account? <Link href="/signup" className="text-brand-100 underline">Subscribe</Link></p>
    </div>
  );
}
