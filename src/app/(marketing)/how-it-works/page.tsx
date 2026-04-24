export default function HowItWorks() {
  const steps = [
    { n: "01", t: "Subscribe", b: "Choose a monthly or yearly plan. We accept all major cards via Stripe." },
    { n: "02", t: "Pick a charity", b: "10 % minimum of your subscription goes directly to a vetted charity you choose." },
    { n: "03", t: "Log scores", b: "Enter your last 5 Stableford scores (1–45). Only the most recent 5 count." },
    { n: "04", t: "Monthly draw", b: "We pull 5 winning numbers each month — random or score-weighted, admin's choice." },
    { n: "05", t: "Win prizes", b: "Match 3, 4 or 5 numbers and split the tier pool. 5-match jackpot rolls if unclaimed." },
    { n: "06", t: "Get paid", b: "Upload proof of your scores; admins verify; payout marked complete." }
  ];
  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <h1 className="h-display mb-10">How it works</h1>
      <div className="space-y-4">
        {steps.map(s => (
          <div key={s.n} className="glass p-6 flex gap-6">
            <span className="text-accent text-2xl font-bold">{s.n}</span>
            <div><h3 className="font-semibold text-xl mb-1">{s.t}</h3><p className="text-muted">{s.b}</p></div>
          </div>
        ))}
      </div>
    </div>
  );
}
