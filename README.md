# Tagly · Never leave without it

Tagly checks your bag every morning and tells you what's missing before you walk out the door.
Mobile web app built from the Tagly Figma prototype (flows) and UI spec (visual design).

## What works

- **Sign in with Google** (one tap = sign-up). Each Google account gets its own items, timetable and settings.
  "Explore the demo" loads sample data; "Continue without Google" keeps everything on this device.
- **Weekly schedule**: add anything you do every week (name, days, start/end, place) — work, gym, lessons, classes. Items can be linked to schedules.
- **Google Calendar (read-only)**: today's events from the calendars you pick, merged with your timetable.
- **Live weather** (Open-Meteo, no key): current temperature, next 8 hours, rain chance. Rain/cold/sun rules add items automatically.
- **Today**: packing list = item rules (always / weekly schedules / event keywords / weather) × today's schedule × forecast. Tap **Pack** to check items off (or let the keyring do it).
- **Tagly AI** (Today card, Find, Settings → Tagly AI):
  - *Predict*: reads event titles (Korean or English) and the forecast and suggests what to add, with a reason and confidence.
    “Team meeting” → laptop + charger; rain 80% from 3 PM → umbrella. Suggests new things to tag when you don't own one yet.
  - *Prioritize*: a forget-risk model on your bag history (weekday, rainy days, event types) flags what you're likely to leave behind.
  - *Detect*: departure detection fuses keyring motion, leaving a saved place and your next event (simulated demo).
  - *Locate*: ranks where a left-behind item probably is (where the signal dropped, where you spent the day).
  - *Learn*: “Add” / “Not today” tune future suggestions; accepting the same idea twice turns it into an automatic rule.
  - Runs **on-device** by default. With `ANTHROPIC_API_KEY` set in Vercel, `/api/ai` uses **Claude** instead (falls back on any error).
- **Items, Find, Settings**: item details and rules, ring / directions / lost mode, keyring feedback, quiet hours, places, privacy.

- **Store (`/shop`)**: Apple-store-style home (categories, product shelves), a **design gallery** of ready-made sticker
  skins (Weather, Classic, Space, Garden, Charge, Music, Clear sets) and hub cases, and a designer:
  - sticker tags: build a pack slot by slot, pick from the gallery or customise art, main/accent colours (18), or clear stickers
  - keyring hub (Ø 38 mm): shell colour, matte/glossy/metallic finish, key ring, strap, engraving, LED light preview
  - hub cases (silicone, bear/bunny/cat ears, cloud, heart, clear, leather): any colour, finish and pattern (polka dots, stripes, checker, gingham, hearts)
  - **Describe a sticker**: type a few words (Korean or English) and get three designs to customise (Claude when configured, otherwise on-device)
  - bag, demo checkout (no payment details collected, nothing charged) and order confirmation

Stickers, keyring and Bluetooth are simulated.

## Run locally

```bash
npm install
cp .env.example .env.local      # put your Google client ID in it
npm run dev                     # http://localhost:5173
```

## Google sign-in setup (once, ~10 min)

1. Open <https://console.cloud.google.com> and create a project (e.g. `Tagly`).
2. **APIs & Services → Library** → enable **Google Calendar API**.
3. **Google Auth Platform → Branding / Get started**: app name `Tagly`, your email, audience **External**.
4. **Google Auth Platform → Audience → Test users**: add the Gmail address of every teammate/tester.
   (While the app is in *Testing*, only these accounts can sign in. Google shows an "unverified app" notice; click Continue.)
5. **Google Auth Platform → Data access → Add scopes**: `.../auth/calendar.readonly` (plus `openid`, `email`, `profile`).
6. **Google Auth Platform → Clients → Create client → Web application**
   - Authorized JavaScript origins: `https://<your-project>.vercel.app` and `http://localhost:5173`
   - No redirect URI is needed. Copy the **Client ID**.
7. **Vercel → Project → Settings → Environment Variables**: `VITE_GOOGLE_CLIENT_ID` = the client ID → **Redeploy**.

Changes in Google Cloud can take a few minutes to apply. An `origin_mismatch` error means the site's address
isn't in the authorized JavaScript origins.

## Privacy

Calendar access is read-only and happens directly between the browser and Google.
The only server code is the optional `/api/ai` function: with Claude on, it receives event titles, item names and the forecast
(never the account, location or bag history) and forwards them to the Anthropic API.
The access token is kept for the browser session only. App data is stored in the browser (localStorage) per account.

## Tagly AI on Claude (optional)

Vercel → Project → Settings → Environment Variables → `ANTHROPIC_API_KEY` = your key (from console.anthropic.com) → Redeploy.
`TAGLY_AI_MODEL` overrides the model (default `claude-haiku-5-5`). Settings → Tagly AI shows whether it's connected.

## Deploy

Push to GitHub → Vercel builds automatically (`npm run build`, output `dist`). `vercel.json` makes deep links work.

## Stack

React 19 · TypeScript · Vite · React Router · Google Identity Services · Google Calendar API · Open-Meteo · Claude (optional, Vercel function) · lucide-react · Inter
