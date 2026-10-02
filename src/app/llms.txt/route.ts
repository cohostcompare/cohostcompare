import { GUIDES } from '@/lib/guides';
import { feeRange, fmtDate, market } from '@/lib/market';
import { RULES, RULES_CHECKED } from '@/lib/rules';
import { POSITIONING, SITE } from '@/lib/seo';

export const dynamic = 'force-dynamic';

/** llms.txt: a plain summary of the site for AI assistants (https://llmstxt.org). */
export async function GET() {
  const m = await market();
  const date = fmtDate(m.asOf);
  const text = `# CoHostCompare

> ${POSITIONING}

Owners never pay. Managers can't pay for placement, ranking, ratings or badges, and paid plans for managers don't change the comparison. Owner contact details go to a manager only after the owner accepts that manager's quote. Based in Sydney, Australia. Contact: hello@cohostcompare.com.

## Key facts (updated ${date})

- Managers listed: ${m.managers}, across ${m.areas} areas in New South Wales and Victoria.
- Typical published management fee: ${m.fee.mid != null ? `${m.fee.mid}% of booking income` : 'n/a'}${feeRange(m.fee) ? ` (range ${feeRange(m.fee)}, from ${m.publishFees} managers that publish a fee)` : ''}.
${m.cities.map((c) => `- ${c.city}: ${c.managers} managers${c.fee.mid != null ? `, typical published fee ${c.fee.mid}%` : ''}${c.nightly ? `, typical nightly rate about A$${c.nightly}` : ''}.`).join('\n')}
- Coverage: a manager covers an address if they run at least one short-term rental within 4 km of it.
- Home counts, nightly rates and guest ratings are estimates from public listings over the last 12 months. Data source: AirROI (www.airroi.com).
- Full figures and how they're worked out: ${SITE}/facts

## How it works

1. Search an address to see the managers who cover it, with fees, guest ratings and homes they run nearby.
2. Enter property details (type, bedrooms, months available a year, help needed); only managers whose requirements fit can be added.
3. Request quotes from up to five managers. Each replies in one standard format, compared on the same revenue.
4. Accept a quote to be introduced. No sales calls.

## Main pages

- [Home and search](${SITE}/): compare managers for an address
- [Areas](${SITE}/areas): managers by area in Sydney, Melbourne and NSW and Victorian holiday areas
- [Market facts](${SITE}/facts): live, dated figures, free to quote with a link
- [Earnings estimate](${SITE}/earnings): free estimate of yearly booking income for an address
- [How it works](${SITE}/how-it-works)
- [Why use us](${SITE}/why-us): neutrality and how profiles are built
- [For managers](${SITE}/managers): claiming a profile, plans and pricing
- [Setting up your rental](${SITE}/setup)

## Guides

${GUIDES.map((g) => `- [${g.title}](${SITE}/guides/${g.slug}): ${g.description}`).join('\n')}

## Short-stay rules by state (checked against official government sources on ${RULES_CHECKED})

${RULES.map((r) => `- [${r.name}](${SITE}/rules/${r.code}): ${r.summary}`).join('\n')}

General information, not legal advice. Each rules page links its official sources.

## Optional

- [Terms](${SITE}/terms)
- [Privacy](${SITE}/privacy)
- [About](${SITE}/about)
`;
  return new Response(text, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
}
