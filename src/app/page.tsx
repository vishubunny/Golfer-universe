"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { Flag, Heart, Trophy, Sparkles } from "lucide-react";

export default function Home() {
  return (
    <>
      {/* HERO — charity-led, not golf-led (PRD §12) */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <div className="absolute left-6 top-24 h-48 w-48 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute right-10 top-32 h-32 w-32 rounded-full border border-white/10 bg-accent/10" />
          <div className="absolute bottom-12 left-1/2 h-[24rem] w-[24rem] -translate-x-1/2 rounded-full border border-white/10 opacity-40" />
          <div className="absolute right-24 bottom-20 h-10 w-10 rounded-full border border-white/20 bg-white/10" />
          <div className="absolute right-16 bottom-16 h-1.5 w-36 rounded-full bg-accent/20" />
        </div>
        <div className="max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-white/80">
              <Sparkles className="size-4 text-accent" /> Play with purpose
            </span>
            <h1 className="h-display mt-6 bg-gradient-to-br from-white to-brand-100 bg-clip-text text-transparent">
              Every score you log<br />helps a cause you love.
            </h1>
            <p className="mt-6 text-lg text-muted max-w-xl mx-auto">
              Subscribe, log your last 5 rounds, enter the monthly draw — and
              channel a portion of your subscription to the charity of your choice.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3 text-sm text-white/70">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2">
                <Flag className="size-4 text-accent" /> Tee off for impact
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2">
                <Heart className="size-4 text-white/80" /> Charity-focused golf
              </div>
            </div>
            <div className="mt-8 flex justify-center gap-3">
              <Link href="/signup" className="btn-primary">Subscribe & start playing</Link>
              <Link href="/charities" className="btn-ghost">Explore charities</Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">How it works</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Heart, title: "Pick a charity", body: "Select a cause from our directory — at least 10 % of your subscription goes to them." },
            { icon: Trophy, title: "Log your scores", body: "Enter your last 5 Stableford scores (1–45). Newest replaces oldest automatically." },
            { icon: Sparkles, title: "Win monthly", body: "Match 3, 4 or 5 numbers in our monthly draw. Jackpot rolls if no 5-match." }
          ].map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="glass p-6"
            >
              <step.icon className="size-7 text-accent" />
              <h3 className="font-semibold mt-4 mb-2">{step.title}</h3>
              <p className="text-muted text-sm">{step.body}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </>
  );
}
