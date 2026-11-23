# Tagly · Never leave without it

Tagly checks your bag every morning and tells you what's missing before you walk out the door.
This is a mobile web app prototype built from the Tagly Figma prototype (flows) and UI spec (visual design).

## What works

- **Onboarding** (5 steps): permissions (real browser prompts for notifications and location), keyring pairing, first sticker + item, calendar and weather.
- **Today**: packing list built from each item's rules (always / event keywords / weather) + today's calendar and forecast, progress bar, keyring state, suggestions, "Pack your way" for today-only changes.
- **Items**: filters by status, item details with live rule editing, add / edit / re-pair / remove.
- **Find**: illustrated map, ring an item, "I found it" → back in your bag, directions (opens Google Maps), mark as lost, mesh network search.
- **Settings**: keyring light/vibration, calendar and weather, morning check and quiet hours, alert types, safe places, permissions, delete data, FAQ, feedback, notification preview (in-app push banners).
- Data is saved in the browser (localStorage). "Explore the demo" on the welcome screen loads sample data.

Hardware (stickers, keyring, Bluetooth), Google Calendar and weather are simulated with sample data.

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

## Deploy to Vercel

Import this repository at <https://vercel.com/new>. Vercel detects Vite automatically
(build `npm run build`, output `dist`). `vercel.json` rewrites routes to `index.html`
so deep links like `/items/pencil` work on refresh.

## Stack

React 19 · TypeScript · Vite · React Router · lucide-react icons · Inter
