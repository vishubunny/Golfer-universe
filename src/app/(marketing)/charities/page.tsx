import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Charity } from "@/types/db";

export const revalidate = 60;

export default async function CharitiesPage() {
  const supabase = createClient();
  const { data } = await supabase.from("charities").select("*").eq("is_active", true).order("is_featured", { ascending: false });
  const charities = (data ?? []) as Charity[];
  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <h1 className="h-display mb-3">Charities</h1>
      <p className="text-muted mb-10 max-w-2xl">Pick the cause that matters to you. A minimum of 10 % of your subscription always goes to your selected charity.</p>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {charities.map(c => (
          <Link key={c.id} href={`/charities/${c.id}`} className="glass overflow-hidden hover:border-brand transition">
            {c.image_url && <img src={c.image_url} alt={c.name} className="w-full h-44 object-cover" />}
            <div className="p-5">
              <div className="flex items-center gap-2 mb-1">
                {c.is_featured && <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent">Featured</span>}
              </div>
              <h3 className="font-semibold mb-1">{c.name}</h3>
              <p className="text-sm text-muted line-clamp-3">{c.description}</p>
            </div>
          </Link>
        ))}
        {!charities.length && <p className="text-muted">No charities listed yet — admins can add some via the admin dashboard.</p>}
      </div>
    </div>
  );
}
