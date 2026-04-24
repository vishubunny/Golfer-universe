"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function AdminLoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);

    try {
      const res = await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || "Login failed");
        setLoading(false);
        return;
      }

      router.push(next ?? "/admin");
      router.refresh();
    } catch (error) {
      setErr("An error occurred. Please try again.");
      setLoading(false);
    }
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

export default function AdminLoginPage() {
  return (
    <div className="max-w-md mx-auto px-6 py-20">
      <h1 className="text-3xl font-bold mb-2">Admin access</h1>
      <p className="text-muted mb-8">Sign in with your admin credentials to manage the platform.</p>
      <Suspense fallback={<div className="glass p-6">Loading…</div>}>
        <AdminLoginForm />
      </Suspense>
      <p className="text-sm text-muted mt-4 text-center"><Link href="/login" className="text-brand-100 underline">User login</Link></p>
    </div>
  );
}