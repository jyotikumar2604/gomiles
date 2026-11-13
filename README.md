# Intercity taxi booking: frontend (React + JavaScript + Vite)

## Run
```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build into /dist
```
Node 18+ is required. Copy `.env.example` to `.env` only when the Express backend exists.

## Backend
The API lives in `server/` (see `server/README.md` and `server/docs/BACKEND_PLAN.md`). The frontend works alone, and talks to the API when `VITE_API_URL` is set.

## Structure
- `src/styles.css` design tokens (colours, radii, shadow, fonts) and all component styles
- `src/config.js` brand name and contact placeholders (the name "Marg Premier" is temporary)
- `src/services/api.js` the only place that talks to a server; returns "not configured" until `VITE_API_URL` is set
- `src/components/` navbar, footer, hero scene, booking panel, trip fields and validation, route summary, status badge, FAQ, modal, alerts and empty states
- `src/pages/` Home, TripRequest, BookingStatus, Info (About, Contact, Login), Dashboard (route `/owner`)
- `src/data/demoData.js` DEMO ONLY. Delete it and replace its imports with API calls.

## What is real and what is not
- Real: navigation, form behaviour and validation, one-way/round-trip switching, review step, FAQ, filters, modal, responsive layouts.
- Not connected: Express, MongoDB, Google Maps, payments, authentication. Sending a request, signing in, looking up a booking and the dashboard all say so instead of faking success. No distance, price or rate is invented anywhere.
- The owner dashboard has no sign-in protection yet. Add role checks on the server before real data is shown.

## Background
One fixed layer (`src/components/PageBackground.jsx` + `HeroScene.jsx`) sits behind every page. Its dim overlay deepens with scroll (opacity only, no blur), and each route sets a base dimness (lighter on Home, heavier on forms and `/owner`). To use a real photo, add `public/hero.jpg` and render `<img src="/hero.jpg" alt="" className="scene" />` inside `PageBackground` above `<HeroScene />`; keep the SVG as fallback and compress the photo (about 200 KB, with a smaller mobile version).

## Needed later
Google Cloud project with billing (Maps/Routes, server key kept on Express), Razorpay keys (server only), MongoDB Atlas, owner rate per km and policies.
