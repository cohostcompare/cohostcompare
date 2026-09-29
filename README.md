# CoHostCompare

Pre-launch website for [cohostcompare.com](https://cohostcompare.com): the neutral place for Australian property owners to compare short-term rental managers.

## What's here

- `index.html`: waitlist landing page (owner and manager sign-up forms)
- `privacy.html`: privacy policy (served at `/privacy`)
- `favicon.svg`: the mark
- `vercel.json`: clean URLs
- `supabase/waitlist.sql`: the sign-up table and its insert-only access rule

## How it runs

- Hosted on Vercel as a static site; every push to `main` deploys.
- Sign-ups go straight from the browser to Supabase (Sydney region) using the publishable key. Row-level security allows inserts only, so the public can't read the list.
- View sign-ups in Supabase: Table Editor → `waitlist`.
