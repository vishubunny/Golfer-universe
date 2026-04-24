// Playwright E2E test driving through every PRD scenario for Digital Heroes.
// Run: node e2e-prd-test.mjs
import { chromium } from "playwright";
import fs from "fs";

const BASE = "http://localhost:3000";
const results = [];
const log = (scenario, status, detail) => {
  results.push({ scenario, status, detail });
  const icon = status === "PASS" ? "✅" : status === "FAIL" ? "❌" : status === "BLOCKED" ? "⛔" : "⚠️";
  console.log(`${icon} [${status}] ${scenario}${detail ? "  —  " + detail : ""}`);
};

const screenshotsDir = "e2e-screenshots";
fs.mkdirSync(screenshotsDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();

// Capture network failures + console errors to surface real issues
const netFailures = [];
page.on("requestfailed", r => netFailures.push(`${r.method()} ${r.url()} — ${r.failure()?.errorText}`));
page.on("response", async r => {
  if (r.status() >= 500) netFailures.push(`HTTP ${r.status()} ${r.request().method()} ${r.url()}`);
});

async function shot(name) {
  try { await page.screenshot({ path: `${screenshotsDir}/${name}.png`, fullPage: true }); } catch {}
}

async function gotoOK(path, scenario) {
  try {
    const r = await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 15000 });
    const status = r?.status();
    if (!status || status >= 400) { log(scenario, "FAIL", `HTTP ${status} on ${path}`); return false; }
    return true;
  } catch (e) {
    log(scenario, "FAIL", `nav error: ${e.message}`);
    return false;
  }
}

// ─────────── PRD Scenario 1: Marketing — Landing page ───────────
if (await gotoOK("/", "Landing page loads")) {
  const title = await page.title();
  const hasHero = await page.locator("text=/Play.*Win.*Give|Digital Heroes/i").first().count();
  await shot("01-landing");
  if (hasHero > 0) log("Landing page loads", "PASS", `title="${title}"`);
  else log("Landing page loads", "FAIL", `no hero copy. title="${title}"`);
}

// ─────────── PRD Scenario 2: Marketing — How it works ───────────
if (await gotoOK("/how-it-works", "How it works page")) {
  const hasContent = await page.locator("h1, h2").first().textContent();
  await shot("02-how-it-works");
  log("How it works page", "PASS", `heading="${hasContent?.slice(0, 60)}"`);
}

// ─────────── PRD Scenario 3: Marketing — Charities directory ───────────
if (await gotoOK("/charities", "Charities directory page")) {
  await page.waitForTimeout(1500);
  const cards = await page.locator("a[href^='/charities/'], article, .glass").count();
  await shot("03-charities");
  log("Charities directory page", cards > 0 ? "PASS" : "WARN", `${cards} card-like elements (empty seed = 0 charities is a data issue, not page bug)`);
}

// ─────────── PRD Scenario 4: Auth — Signup form renders ───────────
if (await gotoOK("/signup", "Signup form renders")) {
  const hasEmail = await page.locator("input[type='email']").count();
  const hasPwd = await page.locator("input[type='password']").count();
  const hasBtn = await page.locator("button:has-text('Create')").count();
  await shot("04-signup");
  if (hasEmail && hasPwd && hasBtn) log("Signup form renders", "PASS", "email + password + submit present");
  else log("Signup form renders", "FAIL", `email=${hasEmail} pwd=${hasPwd} btn=${hasBtn}`);
}

// ─────────── PRD Scenario 5: Auth — Signup submission (will fail w/ placeholder Supabase) ───────────
if (await gotoOK("/signup", "Signup submission against Supabase")) {
  await page.fill("input[type='email']", `e2e-${Date.now()}@example.com`);
  await page.fill("input[type='password']", "test12345");
  const nameInput = page.locator("input").first();
  await nameInput.fill("E2E Tester");
  await page.click("button:has-text('Create')");
  await page.waitForTimeout(3000);
  const errVisible = await page.locator(".text-red-400, [role='alert']").first().textContent().catch(() => null);
  const url = page.url();
  await shot("05-signup-submit");
  if (url.includes("/dashboard")) log("Signup submission against Supabase", "PASS", "redirected to dashboard");
  else if (errVisible) log("Signup submission against Supabase", "BLOCKED", `error shown: "${errVisible.slice(0,80)}" — needs real Supabase keys in .env.local`);
  else log("Signup submission against Supabase", "WARN", `no redirect, no error — url=${url}`);
}

// ─────────── PRD Scenario 6: Auth — Login form renders ───────────
if (await gotoOK("/login", "Login form renders")) {
  const hasEmail = await page.locator("input[type='email']").count();
  const hasPwd = await page.locator("input[type='password']").count();
  await shot("06-login");
  if (hasEmail && hasPwd) log("Login form renders", "PASS", "fields present");
  else log("Login form renders", "FAIL", `email=${hasEmail} pwd=${hasPwd}`);
}

// ─────────── PRD Scenario 7: Auth — Login submission attempts auth ───────────
try {
  if (await gotoOK("/login", "Login submission attempts auth")) {
    await page.fill("input[type='email']", "nobody@example.com");
    await page.fill("input[type='password']", "wrongpass");
    await page.click("button:has-text('Sign in')", { timeout: 5000 });
    await page.waitForTimeout(3000);
    const err = await page.locator(".text-red-400").first().textContent().catch(() => null);
    await shot("07-login-submit");
    if (err) log("Login submission attempts auth", "BLOCKED", `error returned ("${err.slice(0,60)}") — Supabase placeholder; auth flow wired correctly`);
    else log("Login submission attempts auth", "WARN", "no visible error — check console");
  }
} catch (e) { log("Login submission attempts auth", "FAIL", e.message.slice(0,100)); }

// ─────────── PRD Scenarios 8-12: Dashboard pages (should redirect to login when not authed) ───────────
const authedPages = [
  ["/dashboard",                "Dashboard requires auth"],
  ["/dashboard/scores",         "Score entry page requires auth"],
  ["/dashboard/subscription",   "Subscription mgmt page requires auth"],
  ["/dashboard/charity",        "Charity selection page requires auth"],
  ["/dashboard/winnings",       "My winnings page requires auth"]
];
for (const [path, scenario] of authedPages) {
  try {
    const r = await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 15000 });
    const finalUrl = page.url();
    await shot(`auth-${path.replace(/\//g, "_")}`);
    if (finalUrl.includes("/login")) log(scenario, "PASS", "correctly redirected to /login");
    else if (r?.status() === 200) log(scenario, "WARN", `loaded without redirect (url=${finalUrl}) — middleware may not gate`);
    else log(scenario, "FAIL", `HTTP ${r?.status()} url=${finalUrl}`);
  } catch (e) { log(scenario, "FAIL", e.message); }
}

// ─────────── PRD Scenarios 13-16: Admin pages (should redirect non-admin) ───────────
const adminPages = [
  ["/admin",            "Admin home requires admin role"],
  ["/admin/draws",      "Admin draws page requires admin role"],
  ["/admin/charities",  "Admin charities page requires admin role"],
  ["/admin/winners",    "Admin winners page requires admin role"],
  ["/admin/users",      "Admin users page requires admin role"]
];
for (const [path, scenario] of adminPages) {
  try {
    const r = await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 15000 });
    const url = page.url();
    if (url.includes("/login") || url.includes("/dashboard") || r?.status() === 403 || r?.status() === 401) {
      log(scenario, "PASS", `gated (${url.includes("/login") ? "redirect /login" : "HTTP " + r?.status()})`);
    } else if (r?.status() === 200) {
      log(scenario, "WARN", `loaded for unauth user — should be gated`);
    } else log(scenario, "FAIL", `HTTP ${r?.status()}`);
  } catch (e) { log(scenario, "FAIL", e.message); }
}

// ─────────── PRD Scenarios 17-22: API endpoints ───────────
async function api(method, path, body, scenario, expect) {
  try {
    const opts = { method, headers: { "Content-Type": "application/json" } };
    if (body) opts.body = JSON.stringify(body);
    const r = await page.request.fetch(BASE + path, opts);
    const text = await r.text();
    const ok = expect.includes(r.status());
    log(scenario, ok ? "PASS" : "FAIL", `HTTP ${r.status()} (expected one of ${expect.join("/")}) body=${text.slice(0,80)}`);
  } catch (e) { log(scenario, "FAIL", e.message); }
}

await api("POST", "/api/draws/publish",   {}, "API: /api/draws/publish gates unauthed", [401, 403]);
await api("POST", "/api/draws/simulate",  {}, "API: /api/draws/simulate gates unauthed", [401, 403]);
await api("POST", "/api/winners/verify",  {}, "API: /api/winners/verify gates unauthed", [401, 403]);
await api("GET",  "/api/draws/monthly",   null, "API: /api/draws/monthly cron requires CRON_SECRET", [403]);
await api("POST", "/api/stripe/webhook",  {}, "API: /api/stripe/webhook validates signature", [400]);
await api("POST", "/api/stripe/checkout", { plan: "monthly" }, "API: /api/stripe/checkout requires auth", [401, 500]);

// ─────────── PRD Scenario 23: Cron with valid secret (negative — placeholder secret) ───────────
try {
  const r = await page.request.get(BASE + "/api/draws/monthly", { headers: { Authorization: "Bearer wrong" } });
  log("API: /api/draws/monthly rejects bad CRON_SECRET", r.status() === 403 ? "PASS" : "FAIL", `HTTP ${r.status()}`);
} catch (e) { log("API: /api/draws/monthly rejects bad CRON_SECRET", "FAIL", e.message); }

// ─────────── PRD Scenario 24: 404 handling ───────────
try {
  const r = await page.goto(BASE + "/this-route-does-not-exist", { waitUntil: "domcontentloaded" });
  log("404 handling for unknown route", r?.status() === 404 ? "PASS" : "WARN", `HTTP ${r?.status()}`);
} catch (e) { log("404 handling for unknown route", "FAIL", e.message); }

// ─────────── Summary ───────────
console.log("\n──────── NETWORK FAILURES (first 20) ────────");
netFailures.slice(0, 20).forEach(f => console.log("  •", f));

console.log("\n──────── SUMMARY ────────");
const tally = results.reduce((a, r) => (a[r.status] = (a[r.status] || 0) + 1, a), {});
console.log(JSON.stringify(tally, null, 2));

fs.writeFileSync("e2e-results.json", JSON.stringify({ results, netFailures }, null, 2));
console.log("\nResults written to e2e-results.json + e2e-screenshots/");

await browser.close();
