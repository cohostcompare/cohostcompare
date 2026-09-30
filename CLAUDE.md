# CoHostCompare: project context for Claude

Neutral marketplace where Australian property owners compare short-term-rental (STR) managers and request quotes from up to 5. Owner: Ben Deeley (Sydney), hello@cohostcompare.com. Self-service by design: no sales calls.

## Branches and hosting
- `main` = production at www.cohostcompare.com (Next.js 15 App Router, React 19, TypeScript). Vercel deploys `main` to production.
- `app` = working branch; every push deploys a Vercel preview (cohostcompare-git-app-cohostcompare.vercel.app, behind Vercel login). Ship by fast-forwarding `main` to `app`.
- Admin data jobs (AirROI sweep, clustering, seeding) live in `src/lib/jobs/data.ts`, run from /admin/data or `/api/admin/[job]` (admin session or `?pass=ADMIN_TOKEN`).
- Commits on this repo are authored as Claude; the GitHub app is installed on the org.

## Services
- Supabase (Sydney), project hkntldmrckaosytpjakw. SQL migrations in `supabase/00N_*.sql`, run by hand in the SQL editor (001–008 so far). RLS on; server uses the secret key via `adminClient()`.
- Resend sends from hello@ (`src/lib/email.ts`, branded HTML). Supabase Auth email also goes through Resend.
- Google Maps JS (Places API New) in the browser; AirROI API for listing data (derived, aggregated figures only, attributed "Data source: AirROI (www.airroi.com)"; never show listing-level data or Airbnb photos).
- Anthropic API (claude-haiku-4-5) for the rules Q&A at `/api/ask-rules`, grounded only on `src/lib/rules.ts`.
- Vercel env: AIRROI_API_KEY, ADMIN_TOKEN, SUPABASE_SECRET_KEY, RESEND_API_KEY, CRON_SECRET, ANTHROPIC_API_KEY. Never put secrets in chat or code.
- Daily cron `/api/cron/daily` (vercel.json, production only): owner/manager nudges and the hello@ digest.

## Key product rules
- Coverage: a manager covers an address if they run at least one home within 4 km (`managers_near` RPC).
- Public sees fee band; signed-in owners see full fees/terms. Owner contact details go to a manager only after the owner accepts that manager's quote.
- Pre-built public profiles only for identifiable businesses, never private individuals. Managers can claim (auto-approved on matching email domain, else admin review at /admin/claims) or be hidden at /admin/managers (sets `published=false`).
- Quotes use one standard format (`src/lib/quotes.ts`); comparison (`src/components/QuoteTable.tsx`) is neutral: fees compared on the same revenue, factual "stands out for" labels, no paid ranking.
- Rules by state (`src/lib/rules.ts`): official government/council sources only. A scheduled task reviews it on the 1st and 15th and opens a PR into `app` for Ben to approve. The site warns if it's more than 45 days old.

## Style
Plain Australian English, short sentences, sentence case. Brand: teal #0F5E57, ink #10302F, Bricolage Grotesque + Figtree. Photos: Unsplash via `src/components/Photo.tsx` (no landmarks with image-use restrictions).
