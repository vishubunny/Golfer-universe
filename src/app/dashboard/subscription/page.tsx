"use client";
import { useState } from "react";

export default function SubscriptionPage() {
  const [busy, setBusy] = useState<"monthly" | "yearly" | null>(null);
  async function checkout(plan: "monthly" | "yearly") {
    setBusy(plan);
    const res = await fetch("/api/stripe/checkout", { method: "POST", body: JSON.stringify({ plan }) });
    const { url, error } = await res.json();
    setBusy(null);
    if (error) return alert(error);
    if (url) window.location.href = url;
  }
  const plans = [
    { id: "monthly" as const, name: "Monthly", price: "$9.99/mo", perks: ["Cancel anytime", "Monthly draw entry", "10 % min charity"] },
    { id: "yearly"  as const, name: "Yearly",  price: "$99/yr",   perks: ["Save 17 %", "12 monthly draws", "Higher pool contribution"] }
  ];
  return (
    <div className="grid md:grid-cols-2 gap-6">
      {plans.map(p => (
        <div key={p.id} className="glass p-8">
          <h3 className="text-xl font-bold">{p.name}</h3>
          <p className="text-3xl font-bold my-3">{p.price}</p>
          <ul className="text-muted text-sm space-y-1 mb-6">{p.perks.map(x => <li key={x}>✓ {x}</li>)}</ul>
          <button className="btn-primary w-full" onClick={() => checkout(p.id)} disabled={busy === p.id}>
            {busy === p.id ? "Redirecting…" : `Subscribe ${p.name.toLowerCase()}`}
          </button>
        </div>
      ))}
    </div>
  );
}
