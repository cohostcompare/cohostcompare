# CoHostCompare: project context for Claude

Neutral marketplace where Australian property owners compare short-term-rental (STR) managers and request quotes from up to 5. Owner: Ben Deeley (Sydney), hello@cohostcompare.com. Self-service by design: no sales calls.

## Branches and hosting
- `main` = production at www.cohostcompare.com (Next.js 15 App Router, React 19, TypeScript). Vercel deploys `main` to production.
- `app` = working branch; every push deploys a Vercel preview (cohostcompare-git-app-cohostcompare.vercel.app, behind Vercel login). Ship by fast-forwarding `main` to `app`.
- Admin data jobs (AirROI sweep, clustering, seeding) live in `src/lib/jobs/data.ts`, run from /admin/data or `/api/admin/[job]` (admin session or `?pass=ADMIN_TOKEN`).
- Commits on this repo are authored as Claude; the GitHub app is installed on the org.

## Services
- Supabase (Sydney), project hkntldmrckaosytpjakw. SQL migrations in `supabase/00N_*.sql`, run by hand in the SQL editor (001–019 so far). RLS on; server uses the secret key via `adminClient()`.
- Resend sends from hello@ (`src/lib/email.ts`, branded HTML). Supabase Auth email also goes through Resend.
- Google Maps JS (Places API New) in the browser; AirROI API for listing data (derived, aggregated figures only, attributed "Data source: AirROI (www.airroi.com)"; never show listing-level data or Airbnb photos).
- Google Ads: tag AW-18486166646 (`src/components/GoogleTag.tsx`, production only); "Quote request sent" conversion fires once per request on /account?sent=&r= (`QuoteSentConversion.tsx`, label in `src/lib/ads.ts`). Search campaign, no Display/partners; enhanced conversions off.
- Anthropic API (claude-haiku-4-5) for the rules Q&A at `/api/ask-rules`, grounded only on `src/lib/rules.ts`.
- Vercel env: AIRROI_API_KEY, ADMIN_TOKEN, SUPABASE_SECRET_KEY, RESEND_API_KEY, CRON_SECRET, ANTHROPIC_API_KEY, ABN_LOOKUP_GUID. Optional switches: OUTREACH_ENABLED=1 (manager outreach, paused until Ben says), INBOUND_DOMAIN + RESEND_INBOUND_SECRET (email reply tracking), CLICKSEND_USERNAME + CLICKSEND_API_KEY + SMS_FROM (SMS alerts).
- Reply tracking (`src/lib/inbound.ts`, `/api/inbound`): conversation emails carry a signed Reply-To on INBOUND_DOMAIN; Resend posts `email.received`, the reply is added to the thread. Outreach replies stop the sequence.
- Error alerts: `src/instrumentation.ts` → `src/lib/alerts.ts` emails hello@ (production only, max once per 6h per error). Never put secrets in chat or code.
- Daily cron `/api/cron/daily` (vercel.json, production only): owner/manager nudges and the hello@ digest.

## Key product rules
- Coverage: a manager covers an address if they run at least one home within 4 km (`managers_near` RPC).
- Public sees fee band; signed-in owners see full fees/terms. Owner contact details go to a manager only after the owner accepts that manager's quote.
- Pre-built public profiles only for identifiable businesses, never private individuals. Managers can claim (auto-approved on matching email domain, else admin review at /admin/claims) or be hidden at /admin/managers (sets `published=false`).
- Quotes use one standard format (`src/lib/quotes.ts`); comparison (`src/components/QuoteTable.tsx`) is neutral: fees compared on the same revenue, factual "stands out for" labels, no paid ranking.
- Rules by state (`src/lib/rules.ts`): official government/council sources only. A scheduled task reviews it on the 1st and 15th and opens a PR into `app` for Ben to approve. The site warns if it's more than 45 days old.

## Revenue (keep neutral)
- Owners never pay; manager profile, quote requests and replies are free. Free plan: 4 accepted clients a month introduced free (FREE_ACCEPTS_PER_MONTH); after that the manager confirms each client for A$99 (+ GST) by card to get the owner's details and the introduction (`src/lib/intro.ts`, `success_fees`); 48h then the owner is told they can choose another. Pro/Enterprise/founding trial: introduced straight away. Acceptance always ends in one introduction email to owner + manager. Stripe via REST (`src/lib/stripe.ts`, webhook `/api/stripe`, env STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET; GST_REGISTERED=0 drops GST). Logins: Free 1, Pro 3, Enterprise unlimited (Team page, invites via /join). Free-plan shared logins are flagged daily (`src/lib/activity.ts`) and emailed to hello@; never auto-blocked.
- Plans (`src/lib/pro.ts`): Pro A$99/month + GST (insights, 24 photos, SMS alerts via ClickSend `src/lib/sms.ts`, regional reports for their regions + 2 followed, quote templates); Enterprise from A$400/month for multi-region operators (regions, team roles, API/webhooks, portfolio insights; built with first customers). Founding managers who claim by 31 Jan 2027 get Pro free for 3 months, no card. Launch prices fixed 12 months for early subscribers. Pro billed monthly through Stripe Checkout and billing portal; admin can also set plans at /admin/managers. Paid plans must never affect ranking, ratings, badges owners see or the comparison. Terms section 6 covers paid plans.
- Partner offers for owners only on /setup, clearly labelled. Suburb reports are a paid-plan perk, not sold separately (AirROI ToS 5.10 safe harbour). AirROI must stay attributed as the data source wherever its figures appear (short line, `src/components/DataSource.tsx`).
- Regional reports (`src/lib/reports.ts`, regions in `src/lib/regions.ts`): one per region per quarter with a by-suburb table, generated by the daily cron (8 a run) or `/ops/reports`; history kept in `suburb_reports`; managers emailed; viewed at /dashboard/reports.
- Internal test profile `test-profile` (unpublished, Pro): shown only to admins in search results and quote flow (`withTestForAdmin`, TEST_SLUG in `src/lib/data.ts`); created by `/ops/test-profile?email=`.
- Traffic sources (`src/lib/traffic.ts`, `/api/visit`, `TrafficBeacon`): first-party cookies cc_sid (session) and cc_src (30-day first touch; an ad click overrides) → `funnel_events` (visit/search/quote) and `quote_requests.source/campaign`. Admin funnel at /admin/ads (admins excluded).
- Owner reviews of managers (`src/lib/reviews.ts`, `manager_reviews`): only owners who accepted and were introduced; one per thread, editable; publish immediately, admin can hide at /admin/reviews; manager one public reply at /dashboard/[slug]/reviews. Nothing shows on profiles/cards until a manager has one. Never affects ranking; never removed for payment.
- Review invites (`src/lib/reviewInvites.ts`, daily cron): every owner once (per request, max one per 180 days): 14 days after accepting (manager review + Trustpilot) or 21 days after the request (Trustpilot). Never selective. Unsubscribe via email_suppressions.
- Partner offers (`src/lib/partners.ts`): apply at /partners (direct link only, noindex), private signed manage link /partners/manage/[id], admin /admin/partners (approve, referral-fee flag, show/hide switch `site_settings.offers_live`). Offers show on /setup only when the switch is on AND a partner is approved; clicks via /go/[id]. Always labelled, referral fees disclosed.
- Feedback (`src/lib/feedback.ts`, /feedback, /admin/feedback, SQL 018): anyone can send any time (footer link). Pop-up (`FeedbackPrompt`, checked once per session via server action) only for genuine users: owners with a request 2+ days old and a quote or message; managers with 3+ active days and 7+ days since joining. Max 3 shows, 7 days apart, never after answering or "No thanks". Thank-you for an honest "improve" answer (40+ chars), one each, never tied to sentiment: managers only: 1 month Pro (added to pro_until; paying/open-ended Pro → credit by hand). Owners get no reward (Ben's call). No skeleton loading screens (Ben dislikes them); a thin top progress bar only. Terms section 6A.
- Limits: earnings estimator 3 different places a day without an account (then "sign in free"), 25 signed in, bedroom changes free, admins unlimited (`rate_events`, SQL 019, purged after 7 days; plus the global AirROI daily cap in `src/lib/earnings.ts`). Quote requests: 3 per 24h and 15 managers per 30 days per owner (`requestLimit` in `src/app/quote/actions.ts`), hello@ emailed when hit, admins exempt.
- No paid placement anywhere. Never gate the verified badge, visibility in results or lead volume behind payment.

## Style
Plain Australian English, short sentences, sentence case. Brand: teal #0F5E57, ink #10302F, Bricolage Grotesque + Figtree. Photos: Unsplash via `src/components/Photo.tsx` (no landmarks with image-use restrictions).
