# Digital Heroes Platform — Setup on a New Laptop

Get the app running locally in **5 simple steps**. No Supabase, no Stripe, no signups required. Everything (database, auth, storage) runs on your laptop.

---

## ✅ What you need first (one-time install)

1. **Node.js 20 or newer** — download from https://nodejs.org (pick the **LTS** installer and click Next → Next → Finish).
2. *(Windows only)* If `npm install` later complains about `better-sqlite3`, install **Visual Studio Build Tools** with the "Desktop development with C++" workload — but with Node 20 LTS, the prebuilt binary almost always works without this.

To verify Node is installed, open a terminal and run:
```
node -v
npm -v
```
You should see version numbers like `v20.x.x`.

---

## 🚀 Steps to run the app

### 1. Unzip
Unzip `digital-heroes-platform-v1.zip` anywhere you like (e.g. your Desktop or Documents folder).

### 2. Open a terminal in the unzipped folder
**Windows:** open the folder in File Explorer → right-click empty space → **"Open in Terminal"** (or Shift + right-click → "Open PowerShell window here").
**Mac/Linux:** open Terminal and `cd` into the folder.

### 3. Install dependencies
```
npm install
```
*(Takes 1–3 minutes. Downloads everything the app needs.)*

### 4. Build the app
```
npm run build
```
*(Takes ~30 seconds.)*

### 5. Start the server
```
npm start
```
You should see:
```
▲ Next.js 14.2.15
- Local:        http://localhost:3000
✓ Ready in ...ms
```

Open your browser to **http://localhost:3000** 🎉

---

## 🔑 Default admin account

A default admin is auto-created the first time you start the app:

| Field | Value |
|---|---|
| Email | `admin@local.test` |
| Password | `Admin@12345` |

Log in at **http://localhost:3000/login**, then visit **http://localhost:3000/admin** to manage charities, users, draws, and winners.

You can also create normal user accounts at **http://localhost:3000/signup** — they're stored in the local database.

---

## 💳 Subscriptions (Stripe is mocked)

There's no real payment. Click "Subscribe" on `/dashboard/subscription` and it instantly creates a local 30-day or 365-day subscription. Perfect for demos.

---

## 📁 Where is my data?

Everything is in two places inside the project folder:

- **`data/app.db`** — the SQLite database (users, charities, donations, scores, draws, winners, subscriptions).
- **`public/uploads/`** — uploaded files (winner proof photos, etc.).

To **reset everything** to a fresh state, just delete `data/app.db` and restart the server. It will be recreated with the seed data and default admin.

---

## 🛠️ Troubleshooting

**Port 3000 already in use?**
Set a different port before starting:
- Windows PowerShell: `$env:PORT=4000; npm start`
- Mac/Linux: `PORT=4000 npm start`

**`npm install` fails on `better-sqlite3`?**
Make sure you're on Node 20 LTS or newer. If still failing on Windows, install Visual Studio Build Tools (Desktop development with C++).

**Login says "failed to fetch"?**
Make sure the server is actually running (you should see "Ready" in the terminal) and you're using `http://localhost:3000` (not `https`).

**Want to see logs?**
The terminal where you ran `npm start` shows every request and error.

---

## 🌐 Sharing the running app on your local network

Want a friend on the same Wi-Fi to try it?
1. Find your IP: Windows `ipconfig` → look for IPv4 (e.g. `192.168.1.42`).
2. Start the server: `npm start`
3. They open `http://192.168.1.42:3000` in their browser.

*(For a real public URL, see Hosting below.)*

---

## ☁️ Free hosting options (optional)

The easiest free hosts for this app:

- **Railway** (https://railway.app) — connects to GitHub, free tier, persistent disk. Recommended.
- **Render** (https://render.com) — similar; pick a free Web Service.
- **Fly.io** (https://fly.io) — free allowance with persistent volumes.

Important: SQLite needs a **persistent disk** (or volume). Vercel / Netlify won't work as-is because they have read-only filesystems — for those, you'd need to swap SQLite for a hosted Postgres.

Set one environment variable on the host:
```
JWT_SECRET=<paste any long random hex string>
NEXT_PUBLIC_SITE_URL=https://your-app.example.com
```
Mount a persistent volume at `./data` and `./public/uploads`, then deploy with `npm run build && npm start`.

---

## 📋 Quick reference

| Action | Command |
|---|---|
| Install | `npm install` |
| Build | `npm run build` |
| Start | `npm start` |
| Reset database | delete `data/app.db`, restart |
| URL | http://localhost:3000 |
| Admin | `admin@local.test` / `Admin@12345` |

That's it — enjoy! 🦸
