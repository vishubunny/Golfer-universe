# 🏆 Digital Heroes Platform

A subscription-driven full-stack web app combining **golf score tracking + monthly prize draws + charity giving** — built end-to-end on a **100% free** stack per `PRD_Full_Stack_Training.pdf`.

| Layer | Tech | Free tier |
|---|---|---|
| **Framework** | Next.js 14 (App Router, TypeScript) | open-source |
| **DB / Auth / Storage** | Supabase (Postgres + RLS + Auth + Storage) | 500 MB DB, 50k MAU |
| **Payments** | Stripe (test mode) | unlimited test charges |
| **Email** | Resend | 3 000 emails/mo |
| **Hosting** | Vercel (Hobby) + Vercel Cron | unlimited static, 100 GB bw |
| **Tests** | Vitest (17 unit) + Playwright (25 E2E) | open-source |

Everything below uses **only free resources**. No credit card needed except Stripe (test-mode only).

---

## 📑 Contents
1. [Quick local run](#1--quick-local-run)
2. [Database setup (Supabase)](#2--database-setup-supabase)
3. [Stripe setup (optional but recommended)](#3--stripe-setup-test-mode--free)
4. [Email setup (optional)](#4--email-setup-resend--optional)
5. [Run locally end-to-end](#5--run-locally-end-to-end)
6. [Free hosting on Vercel](#6--free-hosting-on-vercel-shareable-public-url)
7. [Sharing with anyone](#7--sharing-with-anyone)
8. [Promote yourself to admin](#8--promote-yourself-to-admin)
9. [Testing](#9--testing)
10. [Troubleshooting](#10--troubleshooting)
11. [Project structure](#11--project-structure)

---

## 1 · Quick local run

```powershell
# Prereqs: Node 18+ (https://nodejs.org), Git
cd digital-heroes-platform
npm install
copy .env.example .env.local      # then fill in values (steps 2–4 below)
npm run build
npm start                          # http://localhost:3000
```

> **Note (Windows):** `npm run dev` may have a PostCSS quirk. Use `npm run build && npm start` for reliable local hosting.

---

## 2 · Database setup (Supabase)

### 2.1 Create a free project
1. Go to **https://supabase.com** → Sign in with GitHub → **New project**
2. Name: `digital-heroes` · Region: nearest to you · Set a strong DB password (save it)
3. Wait ~2 minutes for provisioning

### 2.2 Run the schema
1. In Supabase dashboard → left sidebar → **SQL Editor** → **New query**
2. Open `supabase/schema.sql` from this repo, copy **entire contents**, paste into editor, click **Run**
3. Creates: `profiles`, `subscriptions`, `scores`, `draws`, `winners`, `charities`, `donations` + RLS policies + triggers + storage bucket

### 2.3 Seed sample charities
1. New SQL query → paste **entire** `supabase/seed.sql` → Run
2. Populates 5 sample charities so `/charities` page isn't empty

### 2.4 Copy your keys
1. Left sidebar → **Project Settings** → **API**
2. Copy these 3 values into `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...     # "anon public" key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...          # "service_role" — server only, never commit
```

### 2.5 Configure Auth
1. Left sidebar → **Authentication** → **URL Configuration**
2. **Site URL:** `http://localhost:3000` (change to your Vercel URL after deploy)
3. **Redirect URLs:** add `http://localhost:3000/**` and later `https://YOUR-APP.vercel.app/**`
4. (Optional) Authentication → **Providers** → enable Google/GitHub for social login

✅ **Database is ready.** Signup/login + scores + charity flows now work.

---

## 3 · Stripe setup (test mode — free)

Skip this section if you only want to test signup/scores/charity. Required only for the subscription flow.

### 3.1 Create account
1. **https://dashboard.stripe.com/register** — no credit card needed for test mode
2. Make sure the **"Test mode"** toggle (top-right) is **ON**

### 3.2 Get your API keys
**Developers → API keys** → copy:
```env
STRIPE_SECRET_KEY=sk_test_51...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51...
```

### 3.3 Create 2 products & prices
**Product catalog → + Add product**, create:
- **Monthly plan** — recurring, $9.99/month → copy the `price_xxx` ID
- **Yearly plan** — recurring, $99/year → copy the `price_xxx` ID

```env
STRIPE_PRICE_MONTHLY=price_1ABC...
STRIPE_PRICE_YEARLY=price_1XYZ...
```

### 3.4 Webhook (for local testing — optional)
For local: install Stripe CLI (`scoop install stripe` or `brew install stripe/stripe-cli/stripe`), then:
```powershell
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
# Copy the printed "whsec_..." secret into .env.local:
```
```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 3.5 Test card numbers
- Success: `4242 4242 4242 4242` · any future expiry · any CVC
- Failure: `4000 0000 0000 0002`

---

## 4 · Email setup (Resend) — optional

Needed only for transactional emails (welcome, winner notification).

1. **https://resend.com** → sign up (free 3k/mo)
2. **API Keys → + Create API key** → copy
3. (Production only) **Domains → + Add domain** → verify DNS

```env
RESEND_API_KEY=re_...
RESEND_FROM="Digital Heroes <noreply@yourdomain.com>"
```

For local testing without a domain, use the default `onboarding@resend.dev`.

---

## 5 · Run locally end-to-end

### 5.1 Final `.env.local` checklist
```env
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Stripe (required for subscriptions)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_PRICE_MONTHLY=price_...
STRIPE_PRICE_YEARLY=price_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App
NEXT_PUBLIC_SITE_URL=http://localhost:3000
CRON_SECRET=any-random-32-char-string

# Email (optional)
RESEND_API_KEY=re_...
RESEND_FROM="Digital Heroes <onboarding@resend.dev>"
```

### 5.2 Build & start
```powershell
npm run build
npm start                  # http://localhost:3000
```

### 5.3 Smoke-test the flow
1. Visit http://localhost:3000 → click **Sign up**
2. Create account → redirected to `/dashboard/subscription`
3. Pick a plan → checkout with test card `4242 4242 4242 4242`
4. Pick a charity → enter scores
5. Promote yourself to admin (see [section 8](#8--promote-yourself-to-admin)) → visit `/admin`

---

## 6 · Free hosting on Vercel (shareable public URL)

### 6.1 Push to GitHub
```powershell
cd digital-heroes-platform
git init
git add .
git commit -m "Initial commit — Digital Heroes platform"
gh repo create digital-heroes --public --source=. --push
# OR manually: create repo on github.com, then `git remote add origin ... && git push`
```

> ⚠️ Make sure `.env.local` is in `.gitignore` (it is by default). **Never commit secrets.**

### 6.2 Deploy to Vercel
1. **https://vercel.com** → Sign in with GitHub → **Add New… → Project**
2. **Import** your `digital-heroes` repo → Vercel auto-detects Next.js → click **Deploy**
3. First build will fail because env vars aren't set — that's expected, fix in next step

### 6.3 Add environment variables
1. In your Vercel project → **Settings → Environment Variables**
2. Paste **every** key from your `.env.local` (one at a time or use **Import .env**)
3. Change `NEXT_PUBLIC_SITE_URL` → `https://YOUR-APP.vercel.app`
4. Go to **Deployments** → click latest → **Redeploy**

### 6.4 Update Supabase redirect URLs
1. Supabase → Authentication → URL Configuration
2. **Site URL:** `https://YOUR-APP.vercel.app`
3. **Redirect URLs:** add `https://YOUR-APP.vercel.app/**`

### 6.5 Update Stripe webhook (production)
1. Stripe Dashboard → **Developers → Webhooks → + Add endpoint**
2. URL: `https://YOUR-APP.vercel.app/api/stripe/webhook`
3. Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
4. Copy the **Signing secret** → paste as `STRIPE_WEBHOOK_SECRET` in Vercel env vars → **Redeploy**

### 6.6 Verify cron is scheduled
- Vercel reads `vercel.json` automatically. Cron `/api/draws/monthly` runs at `00:00 UTC` on the 1st of each month.
- Vercel auto-injects `CRON_SECRET` from your env var as the `Authorization` header.

✅ **Your app is now live for free.**

---

## 7 · Sharing with anyone

Your Vercel URL (e.g., `https://digital-heroes.vercel.app`) is **public by default** — share it with anyone via:

| Channel | How |
|---|---|
| **Direct link** | Just paste `https://YOUR-APP.vercel.app` |
| **QR code** | https://qr-code-generator.com — paste your URL |
| **Custom domain** (free) | Vercel → Settings → Domains → add a domain you own (e.g., from Cloudflare/Namecheap), free SSL auto-provisioned |
| **Vercel preview links** | Every PR gets its own URL like `digital-heroes-git-feature-x.vercel.app` |
| **Password-protect** (paid) | Vercel Pro tier only — for free, build a maintenance gate yourself |
| **GitHub repo** | `https://github.com/YOUR-USER/digital-heroes` (already public if you did step 6.1) |

### Tell users to:
1. Visit your URL
2. Click **Sign up** → create an account (only an email is needed; magic link or password)
3. Choose **monthly** or **yearly** subscription → pay with **test card `4242 4242 4242 4242`**
4. Pick a favourite charity
5. Add daily golf scores
6. Wait for the 1st of the month → admin runs draw → check **Winnings**

> 💡 Send them a short note: _"Use Stripe test card 4242 4242 4242 4242 with any future expiry — no real charges."_

---

## 8 · Promote yourself to admin

After signup, run this in **Supabase SQL Editor**:
```sql
update profiles set role = 'admin' where email = 'YOUR_EMAIL@example.com';
```

Then refresh `/admin` — you now have access to:
- `/admin/users` — manage users
- `/admin/draws` — preview / publish monthly draws
- `/admin/charities` — add/edit charities
- `/admin/winners` — verify winners

---

## 9 · Testing

```powershell
npm test                  # 17 Vitest unit tests
node e2e-prd-test.mjs     # 25 Playwright E2E scenarios (need server running)
```

E2E artifacts: `e2e-results.json` + screenshots in `e2e-screenshots/`.

---

## 10 · Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Failed to fetch` on signup | Placeholder Supabase URL | Set real `NEXT_PUBLIC_SUPABASE_URL` + rebuild |
| `/charities` is empty | Forgot to run `seed.sql` | Run it in Supabase SQL editor |
| `/api/stripe/checkout` 500 | Missing/fake Stripe keys | Set real `STRIPE_*` keys + rebuild |
| Vercel deploy fails | Missing env vars | Add all keys in Vercel Settings → Env Vars → Redeploy |
| `npm run dev` → blank page (Windows) | PostCSS quirk on some setups | Use `npm run build && npm start` |
| Cron didn't fire | `CRON_SECRET` mismatch | Check Vercel env var matches `vercel.json` |
| Supabase auth redirects to wrong URL | `Site URL` not updated | Supabase → Auth → URL Config → set to Vercel URL |
| OAuth callback error | Redirect URL not whitelisted | Supabase → Auth → URL Config → add `https://YOUR.vercel.app/**` |

> **Important on `NEXT_PUBLIC_*` env vars:** these are **baked at build time**, not runtime. Change them → re-run `npm run build` (or redeploy on Vercel).

---

## 11 · Project structure

```
digital-heroes-platform/
├─ src/
│  ├─ app/
│  │  ├─ (marketing)/    # Public: /, /how-it-works, /charities
│  │  ├─ (auth)/         # /login, /signup
│  │  ├─ dashboard/      # User: scores, subscription, charity, winnings
│  │  ├─ admin/          # Admin: draws, users, charities, winners
│  │  └─ api/            # Routes: stripe, draws, winners
│  └─ lib/               # supabase clients, draw-engine, prize-pool, scores
├─ supabase/
│  ├─ schema.sql         # tables, RLS, triggers, storage
│  └─ seed.sql           # sample charities
├─ tests/                # Vitest unit suites (17 tests)
├─ e2e-prd-test.mjs      # Playwright E2E driver (25 scenarios)
├─ middleware.ts         # auth gate for /dashboard + /admin
├─ vercel.json           # cron schedule
└─ .env.example          # env var template
```

---

## 🆘 Need help?

- Supabase docs → https://supabase.com/docs
- Stripe testing → https://stripe.com/docs/testing
- Vercel deploy → https://vercel.com/docs
- Next.js 14 → https://nextjs.org/docs

**License:** MIT. Have fun, win prizes, give to charity. 🏌️🎲❤️
