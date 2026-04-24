"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { Heart, Trophy, Sparkles } from "lucide-react";

export default function Home() {
  return (
    <>
      {/* HERO — charity-led, not golf-led (PRD §12) */}
      <section className="relative overflow-hidden">
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
            <div className="mt-8 flex justify-center gap-3">
              <Link href="/signup" className="btn-primary">Subscribe & start playing</Link>
              <Link href="/charities" className="btn-ghost">Explore charities</Link>
            </div>
          </motion.div>
        </div>
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 size-[600px] rounded-full bg-brand/30 blur-[120px] -z-10" />
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
