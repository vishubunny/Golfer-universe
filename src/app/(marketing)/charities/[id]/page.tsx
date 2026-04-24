import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Charity } from "@/types/db";

export default async function CharityDetail({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data } = await supabase.from("charities").select("*").eq("id", params.id).single();
  if (!data) notFound();
  const c = data as Charity;
  return (
    <article className="max-w-4xl mx-auto px-6 py-16">
      {c.image_url && <img src={c.image_url} alt={c.name} className="w-full h-72 object-cover rounded-2xl mb-8" />}
      <h1 className="h-display mb-4">{c.name}</h1>
      <p className="text-lg text-white/80 leading-relaxed">{c.description}</p>
      {c.website && <a href={c.website} target="_blank" rel="noreferrer" className="btn-ghost mt-8 inline-flex">Visit website ↗</a>}
    </article>
  );
}
