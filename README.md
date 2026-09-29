# CoHostCompare

The neutral place for Australian property owners to compare short-term rental managers: [cohostcompare.com](https://www.cohostcompare.com).

## Stack
- Next.js (App Router) on Vercel; Supabase (Sydney) for data and sign-in; Google Places for address search; Resend for email.
- `main` = live site. Feature work happens on branches, which Vercel deploys as previews.

## Layout
- `src/app` — pages: home search, `/search`, `/managers/[slug]`, `/managers` (for managers), `/quote`, `/privacy`
- `src/lib/data.ts` — data access; strips owner-only fields before anything reaches the browser
- `src/lib/demo-data.ts` — invented demo managers (flagged on screen) until researched profiles are loaded
- `supabase/` — SQL for tables and access rules
- `public/email/signature.html` — Gmail signature (served at `/email/signature`)

## Local
`npm install && npm run dev`
