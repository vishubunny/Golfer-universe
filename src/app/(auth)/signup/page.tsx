"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, full_name: name })
      });

      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || "Signup failed");
        setLoading(false);
        return;
      }

      router.push("/dashboard/subscription");
      router.refresh();
    } catch (error) {
      setErr("An error occurred. Please try again.");
      setLoading(false);
    }
  }
  return (
    <div className="max-w-md mx-auto px-6 py-20">
      <h1 className="text-3xl font-bold mb-2">Join the movement</h1>
      <p className="text-muted mb-8">Create your account, then choose a plan + charity.</p>
      <form onSubmit={submit} className="space-y-4 glass p-6">
        <div><label className="label">Full name</label><input className="input" required value={name} onChange={e => setName(e.target.value)} /></div>
        <div><label className="label">Email</label><input className="input" type="email" required value={email} onChange={e => setEmail(e.target.value)} /></div>
        <div><label className="label">Password</label><input className="input" type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} /></div>
        {err && <p className="text-red-400 text-sm">{err}</p>}
        <button className="btn-primary w-full" disabled={loading}>{loading ? "Creating…" : "Create account"}</button>
      </form>
      <p className="text-sm text-muted mt-4 text-center">Already have one? <Link href="/login" className="text-brand-100 underline">Sign in</Link></p>
    </div>
  );
}
