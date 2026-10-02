# Cost and revenue forecast, 2 Oct 2026

Rerun with `python3 docs/forecast/model.py` after updating the assumptions with real data. Review due early December 2026.

## Setup cost so far (A$, ex GST, A$1.52 per US$)
- AirROI launch-region data: US$455 (about A$690). 673 search calls at US$0.50 = US$337; the rest is estimates, host lookups and testing.
- Everything else: about A$150–250.
- Total: about A$850–950 (excludes Claude subscription, lawyer, Ben's time).

## Monthly running cost: about A$950–1,000
- Google Ads A$25/day = A$760
- Supabase Pro US$25 = A$38; Vercel Pro US$20 = A$30; Resend Pro US$20 = A$30 (free plan caps 100 emails a day)
- AirROI estimates + manager data refresh about twice a year: A$60–100
- ClickSend, Anthropic (rules Q&A), domain: A$10–20; Google Workspace (hello@) extra
- Stripe about 1.75% + 30c per payment

## All-Australia expansion
- One-off data: about US$750–900 (A$1,150–1,400) for about 120 more areas (launch cost about US$6 per area).
- Ongoing data refresh: about A$120/month more. Matching ads: another A$25/day.

## Assumptions (base case)
- Ads: A$3 per click (about 250 clicks/month), 3% of clicks request quotes; ramps 50% / 80% / 100% over the first 3 months.
- Organic visits grow to about 1,800/month (current regions) and 2,200 (rest of Australia), 1.5% request quotes.
- Each request goes to about 3 managers; 35% end in an accepted quote.
- Claims: 12% of emailed managers in the first two months, 15% of unclaimed managers who get a real request, 0.5%/month drift.
- Pro: 12% of founding managers pay after 3 free months; 5% of later claims; 4% monthly churn. One Enterprise from month 15.
- A$99 unlock fee: almost no revenue for 2+ years because no manager exceeds 4 free clients a month at this volume.

## Results (net per month, cumulative in brackets)
| Month | A: current regions | B: all Australia now | C: all Australia Jul 2027 | D: national pages Jan 2027, no extra ads |
|---|---|---|---|---|
| 3 | −970 (−2.9k) | −1,850 (−6.9k) | −970 (−2.9k) | −970 (−2.9k) |
| 6 | −560 (−4.9k) | −950 (−10.3k) | −560 (−4.9k) | −680 (−6.6k) |
| 9 | −430 (−6.2k) | −670 (−12.5k) | −430 (−6.2k) | −240 (−7.4k) |
| 12 | −390 (−7.4k) | −190 (−13.1k) | −1,170 (−11.3k) | −150 (−7.9k) |
| 18 | +40 (−8.0k) | +310 (−12.2k) | −510 (−15.7k) | +800 (−4.3k) |
| 24 | +30 (−7.8k) | +290 (−10.4k) | +30 (−15.8k) | +860 (+0.8k) |

Sensitivity: D still best with half the organic traffic (−2.6k at 24 months vs −9.5k for A) and with 25% Pro conversion (+11.5k vs −0.1k for A). Doubling ads in current regions ends about −20k at 24 months.

## Recommendation
Current regions only at A$25/day until December. In January, if there are 40+ claimed managers and 15+ requests a month, pull national data (about A$1,300) and publish national pages for search traffic only, extend the founding Pro deadline for new regions, and add ads to a region only once its pages bring requests. Biggest lever: Pro conversion. Revisit the 4 free clients a month once requests pass about 100 a month.
