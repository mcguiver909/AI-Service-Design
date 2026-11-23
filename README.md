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
- **Items, Find, Settings**: item details and rules, ring / directions / lost mode, keyring feedback, quiet hours, places, privacy.

- **Store (`/shop`)**: Apple-store-style home (categories, product shelves), a **design gallery** of ready-made sticker
  skins (Weather, Classic, Space, Garden, Charge, Music, Clear sets) and hub cases, and a designer:
  - sticker tags: build a pack slot by slot, pick from the gallery or customise art, main/accent colours (18), or clear stickers
  - keyring hub (Ø 38 mm): shell colour, matte/glossy/metallic finish, key ring, strap, engraving, LED light preview
  - hub cases (silicone, bear/bunny/cat ears, cloud, heart, clear, leather): any colour, finish and pattern (polka dots, stripes, checker, gingham, hearts)
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

Calendar access is read-only and happens directly between the browser and Google; there is no Tagly server.
The access token is kept for the browser session only. App data is stored in the browser (localStorage) per account.

## Deploy

Push to GitHub → Vercel builds automatically (`npm run build`, output `dist`). `vercel.json` makes deep links work.

## Stack

React 19 · TypeScript · Vite · React Router · Google Identity Services · Google Calendar API · Open-Meteo · lucide-react · Inter
