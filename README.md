# Tagly · Never leave without it

Tagly is a smart-sticker service for the things you carry. Clear sticker tags go on your items, a small keyring hub
lives on your bag, and the app works out what you need each day from your schedule, calendar and the weather.
When you head out without something, the keyring buzzes; when you leave something behind, Tagly remembers where.

Mobile web app built from the Tagly Figma prototype (flows) and UI spec (visual design), plus a store site for
custom stickers, hubs and cases. Built for the *AI Service Design* course at Sungkyunkwan University.

## What works

### App (`/`)

- **Sign in with Google** (one tap = sign-up). Each account gets its own items, stickers, schedule and settings.
  - **Explore the demo** loads a sample day with four weeks of bag history.
  - **Continue without Google** keeps everything on this device.
  - If the site has no Google client ID yet, sign-in runs in **preview mode** with a sample calendar.
- **Today**, the start-of-day screen, from top to bottom:
  - "Good morning, *nickname*": time-aware greeting (nickname in Settings → Account) and keyring status.
  - **Today's schedule**: weekly schedule + selected Google calendars.
  - **Weather** (Open-Meteo, no key): now, high/low, next 8 hours with rain chance.
  - **Packing list** with progress. Built from item rules (always / weekly schedules / event keywords / weather)
    × today's schedule × forecast. Tap **Pack**, or let the keyring do it. Items you often forget are flagged.
  - **Tagly AI suggests**: what today might need that isn't on the list yet, with one-tap **Add** or ✕.
- **Items** has two tabs:
  - **Items**: each item, its status, sticker ID and battery; rules for when you need it.
  - **Stickers**: every registered sticker and the item it's on. Register new stickers by scanning, then attach,
    move, swap, detach or remove them. Add item can reuse a free sticker or scan a new one.
- **Find**: map, ring, directions, lost mode, and Tagly AI's ranking of where a left-behind item probably is.
- **Settings**: account and nickname, weekly schedule, Google Calendar, weather, keyring light/vibration,
  morning check, quiet hours, alert types, places, Tagly AI, privacy and data deletion.

### Tagly AI

| Step | What it does | In this build |
|---|---|---|
| **Predict** | Reads event titles (Korean or English) and the forecast and suggests what to add, with a reason. “팀플 회의” → laptop, charger; rain 80% from 3 PM → umbrella. Suggests new things to tag when you don't own one yet. | Live |
| **Prioritize** | A forget-risk model on your bag history (weekday, rainy days, event types) flags what you're likely to leave behind: “Left behind on 3 of your last 4 Mondays · 69%”. | Live |
| **Detect** | Departure detection fuses keyring motion, leaving a saved place and your next event, so the reminder lands as you walk out. | Simulated (Settings → Tagly AI → Try departure detection) |
| **Locate** | When an item drops out of range, the phone saves the spot. Tagly ranks where it most likely is from where the signal dropped and where you spent the day. | Live |
| **Learn** | “Add” and ✕ tune future suggestions. Accept the same idea twice and it becomes an automatic rule. | Live |

Runs **on-device** by default (no key, nothing leaves the browser). With `ANTHROPIC_API_KEY` set in Vercel,
`/api/ai` uses **Claude** for the suggestions instead and falls back to on-device on any error.

### Store (`/shop`)

- **Meet Tagly** film pops up on the first visit (✕, the backdrop or Esc closes it; “Watch the film” replays it).
- Apple-store-style home with categories and product shelves.
- **Design gallery** of ready-made sticker skins (Clear, Weather, Classic, Space, Garden, Charge, Music) and hub cases.
- **Designer**:
  - Sticker tags: build a pack slot by slot from the gallery, customise art and colours (18), choose clear stickers,
    or **upload your own PNG/JPEG** with an automatic die-cut line for each image.
  - Keyring hub (Ø 38 mm): shell colour, matte/glossy/metallic finish, key ring, strap, engraving, LED preview.
  - Hub cases (silicone, bear/bunny/cat ears, cloud, heart, clear, leather): any colour, finish and pattern.
- Bag, demo checkout (no payment details collected, nothing charged) and order confirmation.

Stickers, keyring, Bluetooth and departure sensing are simulated; the app shows how the service behaves.

## Run locally

```bash
npm install
cp .env.example .env.local      # put your Google client ID in it (optional)
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

## Tagly AI on Claude (optional)

Vercel → Project → Settings → Environment Variables → `ANTHROPIC_API_KEY` = your key (from console.anthropic.com) → Redeploy.
`TAGLY_AI_MODEL` overrides the model (default `claude-haiku-5-5`). Settings → Tagly AI shows whether it's connected.

## Privacy

- Calendar access is read-only and happens directly between the browser and Google. The access token lasts for the browser session only.
- App data (items, stickers, schedule, bag history) is stored in the browser (localStorage), separately per account.
- The only server code is the optional `/api/ai` function. With Claude on, it receives event titles, item names and
  the forecast (never the account, location or bag history) and forwards them to the Anthropic API.

## Project structure

```
api/ai.ts                 Vercel function: Tagly AI on Claude (optional)
src/store.tsx             app state, accounts, packing-list rules, stickers, demo data
src/ai.ts                 Tagly AI: suggestions, forget risk, likely places, departure fusion
src/google.ts, sync.tsx   Google sign-in and Calendar sync
src/weather.ts            Open-Meteo forecast
src/screens/              Today, Items, Stickers, Find, Settings, Tagly AI, onboarding, login
src/components/           UI kit, AI card, item form, icons, map
src/shop/                 store site: home, gallery, designer, die-cut generator, cart, checkout
public/media/             Meet Tagly film and poster
```

## Deploy

Push to GitHub → Vercel builds automatically (`npm run build`, output `dist`). `vercel.json` makes deep links work
and keeps `/api` for the AI function.

## Stack

React 19 · TypeScript · Vite · React Router · Google Identity Services · Google Calendar API · Open-Meteo ·
Claude (optional, Vercel function) · lucide-react · Inter
