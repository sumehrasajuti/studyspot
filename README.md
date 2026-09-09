# StudySpot

Native mobile app for finding available study spaces at SFU. Crowdsourced occupancy reporting with time-decay weighting, plus LLM-powered natural language search ("quiet spot with outlets, not too busy").

## What's built

```
studyspot/
  backend/     Express + TypeScript API
  database/    Postgres schema + seed data (for Supabase)
  mobile/      React Native (Expo) + TypeScript app
```

**Backend**
- `GET /buildings` — all buildings with rolled-up occupancy
- `GET /buildings/:id` — one building with its rooms and computed occupancy
- `POST /rooms/:id/reports` — submit a crowdsourced status report
- `GET /search?q=...` — LLM parses a natural-language query into filters, returns matching rooms
- Occupancy is computed server-side from recent reports with time-decay weighting (see `backend/src/occupancy.ts`) — not just the latest single report

**Mobile**
- Home screen: building list + search
- Building detail: room list with live occupancy bars
- Report modal: matches the original app's 4-state reporting UI
- All screens are TypeScript, typed against the same shapes the backend returns

**Not built yet (good next steps once this is running):**
- Auth (so reports can be tied to a user / rate-limited)
- Real sensor/booking-API data source to blend with crowdsourced reports
- Tests + CI
- Production deployment

---

## Setup — what you need to do on your machine

### 1. Install tools (skip any you already have)
- **Node.js LTS** — [nodejs.org](https://nodejs.org)
- **VS Code** — [code.visualstudio.com](https://code.visualstudio.com)
- **Expo Go** app on your phone (App Store / Play Store) — lets you run the app without Xcode/Android Studio

### 2. Create two free accounts
- **[supabase.com](https://supabase.com)** — sign up, click "New Project", pick a name/password/region. Wait ~2 min for it to provision.
- **[console.anthropic.com](https://console.anthropic.com)** — sign up, go to "API Keys", create a new key. Copy it somewhere safe (you can't view it again after closing the dialog).

### 3. Set up the database
1. In your Supabase project, go to **SQL Editor** → **New query**.
2. Open `database/schema.sql` from this project, copy its entire contents, paste into the SQL editor, and click **Run**.
3. You should see "Success. No rows returned" — this created the tables and inserted the seed buildings/rooms/reports.

### 4. Configure and run the backend
```bash
cd studyspot/backend
npm install
cp .env.example .env
```
Open `.env` in VS Code and fill in:
- `DATABASE_URL` — in Supabase: **Project Settings → Database → Connection string → URI** (choose the "Transaction" pooler option). Replace `YOUR_PASSWORD` with the DB password you set when creating the project.
- `ANTHROPIC_API_KEY` — the key you copied in step 2.

Then:
```bash
npm run dev
```
Visit `http://localhost:3000/health` in a browser — you should see `{"status":"ok"}`. Visit `http://localhost:3000/buildings` — you should see JSON with the 5 seeded buildings.

### 5. Find your computer's local IP address
Your phone (running Expo Go) can't reach `localhost` — that means the phone itself. It needs your computer's IP on the same WiFi network.

On Windows, open a terminal and run:
```
ipconfig
```
Look for **IPv4 Address** under your active network adapter (usually "Wireless LAN adapter Wi-Fi") — something like `192.168.1.42`.

Open `mobile/src/api/client.ts` and replace the placeholder:
```ts
const API_BASE_URL = "http://192.168.1.42:3000"; // <- put your real IP here
```

Your phone and computer must be on the **same WiFi network** for this to work.

### 6. Configure and run the mobile app
```bash
cd studyspot/mobile
npm install
npx expo start
```
Scan the QR code with Expo Go (iOS: use your camera app; Android: use the in-app scanner). The app should load, show 5 buildings, and tapping one should show its rooms with live occupancy.

### 7. Push to GitHub
```bash
cd studyspot
git init
git add .
git commit -m "Initial StudySpot rebuild: Express API + Postgres + React Native app with LLM search"
```
Create a repo at [github.com/new](https://github.com/new) (don't initialize with a README), then:
```bash
git remote add origin https://github.com/YOUR_USERNAME/studyspot.git
git branch -M main
git push -u origin main
```

---

## Troubleshooting

- **Mobile app can't reach the backend**: double check the IP in `client.ts` matches your current `ipconfig` output — it changes if you reconnect to WiFi. Also confirm the backend terminal still shows it running.
- **Search returns everything unfiltered**: check the backend terminal for an Anthropic API error — usually a bad/missing key in `.env`.
- **Supabase connection fails**: make sure you used the pooled connection string (port 6543), and that your password doesn't contain characters that need URL-encoding (regenerate a simpler password if so).

## Suggested next steps once this runs

1. Add auth (Supabase Auth is the path of least resistance since you're already on Supabase) so you can rate-limit reports per user.
2. Pull in SFU's room booking data as a second occupancy signal, blended with crowdsourced reports.
3. Add a room-history summary endpoint using the LLM ("usually quiet before noon, fills up during midterms") from historical report data.
4. Write tests (Jest) for `occupancy.ts`'s decay math — it's the trickiest logic in the app and a good interview talking point.
5. Add a Dockerfile for the backend and a GitHub Actions workflow running lint/tests on PRs.
