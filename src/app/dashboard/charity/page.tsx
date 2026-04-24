"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Charity } from "@/types/db";

export default function CharityPage() {
  const supabase = createClient();
  const [charities, setCharities] = useState<Charity[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [pct, setPct] = useState(10);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: cs }, { data: { user } }] = await Promise.all([
        supabase.from("charities").select("*").eq("is_active", true),
        supabase.auth.getUser()
      ]);
      setCharities((cs ?? []) as Charity[]);
      if (user) {
        const { data: p } = await supabase.from("profiles").select("charity_id, charity_pct").eq("id", user.id).single();
        if (p) { setSelected(p.charity_id); setPct(p.charity_pct); }
      }
    })();
  }, [supabase]);

  async function save() {
    setMsg(null);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("profiles").update({ charity_id: selected, charity_pct: pct }).eq("id", user!.id);
    setMsg(error ? error.message : "Saved!");
  }

  return (
    <div className="space-y-6">
      <div className="glass p-6">
        <h3 className="font-semibold mb-4">Choose your charity</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {charities.map(c => (
            <button key={c.id} onClick={() => setSelected(c.id)}
              className={`text-left p-4 rounded-xl border transition ${selected === c.id ? "border-brand bg-brand/10" : "border-white/10 bg-white/5 hover:border-white/30"}`}>
              <p className="font-medium">{c.name}</p>
              <p className="text-sm text-muted line-clamp-2 mt-1">{c.description}</p>
            </button>
          ))}
        </div>
      </div>
      <div className="glass p-6">
        <label className="label">Contribution % of subscription (min 10)</label>
        <input type="range" min={10} max={100} value={pct} onChange={e => setPct(+e.target.value)} className="w-full" />
        <p className="text-2xl font-bold mt-2">{pct}%</p>
      </div>
      <button onClick={save} className="btn-primary">Save preferences</button>
      {msg && <p className="text-sm text-accent">{msg}</p>}
    </div>
  );
}
