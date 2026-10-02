import Link from 'next/link';
import type { ReactNode } from 'react';
import { RULES, RULES_CHECKED } from '@/lib/rules';
import { feeRange, fmtDate, type Market } from '@/lib/market';

/*
 Owner guides. Facts only: fee figures come live from the managers we list (published fees), rules from src/lib/rules.ts
 (official sources). No made-up statistics; anything general is phrased as general.
*/

export type Guide = {
  slug: string;
  title: string;
  short: string; // card title
  description: string;
  published: string;
  modified: string; // bump when the text changes
  faqs: [string, string][];
  body: (m: Market) => ReactNode;
};

const nsw = RULES.find((r) => r.code === 'nsw')!;
const vic = RULES.find((r) => r.code === 'vic')!;

function CityFees({ m, city }: { m: Market; city: string }) {
  const rows = m.areaList.filter((a) => a.city === city && a.managers > 0).sort((a, b) => b.managers - a.managers);
  if (!rows.length) return null;
  return (
    <div className="table-wrap">
      <table className="data-table">
        <caption className="hint" style={{ textAlign: 'left', captionSide: 'bottom', paddingTop: 6 }}>Managers running homes within 4 km of each area. Fees are only where the manager publishes one. Nightly rates are estimates from public listings over the last 12 months. Updated {fmtDate(m.asOf)}.</caption>
        <thead><tr><th scope="col">Area</th><th scope="col">Managers</th><th scope="col">Published fees</th><th scope="col">Typical fee</th><th scope="col">Typical nightly rate</th></tr></thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a.slug}>
              <th scope="row"><Link href={`/areas/${a.slug}`}>{a.label}</Link></th>
              <td>{a.managers}</td>
              <td>{feeRange(a.fee) || 'On request'}</td>
              <td>{a.fee.mid != null ? `${a.fee.mid}%` : '–'}</td>
              <td>{a.nightly ? `A$${a.nightly}` : '–'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const city = (m: Market, c: string) => m.cities.find((x) => x.city === c);

export const GUIDES: Guide[] = [
  {
    slug: 'airbnb-management-fees-sydney',
    short: 'Airbnb management fees in Sydney',
    title: 'Airbnb management fees in Sydney (2026): what managers charge and what’s included',
    description: 'What Sydney Airbnb and short-term rental managers charge, from the fees they publish, what the percentage covers, the extra costs to ask about, and how to compare quotes fairly.',
    published: '2026-10-02', modified: '2026-10-02',
    faqs: [
      ['How much do Airbnb managers charge in Sydney?', 'Most Sydney managers charge a percentage of your booking income. Our live figures, from the managers who publish their fees, are shown at the top of this guide and update as managers change their fees.'],
      ['Is GST included in the management fee?', 'Not always. Many managers quote their fee plus GST. Our standard quote format asks every manager to say whether GST is added, so you can compare like with like.'],
      ['What costs are usually extra?', 'Common extras are a one-off setup or onboarding fee, cleaning and linen (often paid by guests through a cleaning fee), professional photos, furnishing, consumables and maintenance call-outs. Ask each manager which of these are included.'],
      ['Is a lower fee always better?', 'No. A manager who earns more per booking or fills more nights can leave you better off even with a higher fee. Compare homes they run near you, guest ratings and the full quote, not just the percentage.'],
    ],
    body: (m) => {
      const s = city(m, 'Sydney');
      return (
        <>
          <p>Short-term rental managers in Sydney usually charge a percentage of the booking income your property earns. The percentage is only part of the cost, though. What it covers, what’s extra and what it’s worked out on all change what you actually pay.</p>
          <h2>What Sydney managers charge</h2>
          {s && s.fee.count > 0 ? (
            <div className="guide-stat">
              <div><b>{s.fee.mid}%</b><span>typical published fee in Sydney</span></div>
              <div><b>{feeRange(s.fee)}</b><span>range of published fees</span></div>
              <div><b>{s.managers}</b><span>managers running homes in the Sydney areas we cover</span></div>
            </div>
          ) : <p>Most managers in Sydney quote fees on request.</p>}
          {s && s.fee.count > 0 && <p>These figures come from the {s.fee.count} Sydney managers who publish a fee, on their own website or their CoHostCompare profile. The typical fee is the middle value, using the mid-point of each manager’s range. Updated {fmtDate(m.asOf)}. Many managers only quote on request, which is why getting quotes in one standard format helps.</p>}
          {m.areaList.some((a) => a.city === 'Sydney' && a.managers > 0) && <><h3>By area</h3><CityFees m={m} city="Sydney" /></>}
          <h2>What the percentage usually covers</h2>
          <p>A full-service fee commonly covers listing the property, pricing, guest messages, check-in, coordinating cleans, and handling reviews and issues during stays. Some managers include linen, consumables and restocking. Others charge for them separately or pass them on to guests in the cleaning fee.</p>
          <h2>Costs to ask about</h2>
          <ul>
            <li><b>Setup or onboarding fee:</b> a one-off charge to photograph, list and prepare the property.</li>
            <li><b>Cleaning and linen:</b> often charged to guests as a cleaning fee, but check who pays for the clean between your own stays.</li>
            <li><b>GST:</b> many fees are quoted plus GST.</li>
            <li><b>Minimum term and notice:</b> a lock-in period or long notice period can cost you if it doesn’t work out.</li>
            <li><b>Maintenance and call-outs:</b> whether there’s a margin or call-out fee on trades.</li>
            <li><b>Owner stays:</b> whether you can block out dates for yourself, and any cost.</li>
          </ul>
          <h2>Compare fees on the same revenue</h2>
          <p>Two managers with the same percentage can cost different amounts if one charges on total booking income and the other after platform fees or cleaning fees. When you request quotes on CoHostCompare, every manager answers in the same format, and the comparison shows each fee against the same revenue so the difference is clear.</p>
          <h2>Rules that affect Sydney owners</h2>
          <p>{nsw.summary} <Link href="/rules/nsw">Read the NSW rules</Link>.</p>
        </>
      );
    },
  },
  {
    slug: 'co-host-vs-full-service-manager',
    short: 'Co-host or full-service manager?',
    title: 'Co-host or full-service manager: which suits your property?',
    description: 'The difference between an Airbnb co-host and a full-service short-term rental manager in Australia: who owns the listing, what each does, how they charge, and questions to ask.',
    published: '2026-10-02', modified: '2026-10-02',
    faqs: [
      ['What is an Airbnb co-host?', 'A co-host is someone you add to your own Airbnb listing to help run it. The listing and its reviews stay in your account, and you choose what the co-host can do, from guest messages to managing the calendar and pricing.'],
      ['What does a full-service manager do?', 'A full-service manager takes care of everything: listing, pricing, guests, cleaning, linen and maintenance, often across several booking platforms. Some list your home under their own account.'],
      ['Who keeps the reviews if I change manager?', 'If the listing is in your account, the reviews stay with you. If the manager lists it under their account, the listing and its reviews usually stay with them when you leave. Ask before you sign.'],
      ['Which is cheaper?', 'It depends on what’s included. Compare the full quote, including setup fees, cleaning and minimum term, rather than the percentage alone.'],
    ],
    body: (m) => (
      <>
        <p>Both a co-host and a full-service manager take the day-to-day work off your hands. The differences are in who controls the listing, how much they do, and how they charge. Some businesses offer both, so the labels overlap.</p>
        <h2>Co-host</h2>
        <p>A co-host works on your existing listing. You add them on Airbnb and choose their permissions. The listing, its reviews and your payout settings stay in your account.</p>
        <ul>
          <li>Good if you want to stay in control, or already have a well-reviewed listing.</li>
          <li>Services vary: some only handle guests and cleans, others do almost everything.</li>
          <li>You may still handle some things yourself, such as restocking or maintenance.</li>
        </ul>
        <h2>Full-service manager</h2>
        <p>A full-service manager runs the whole operation, often on several platforms such as Airbnb, Booking.com and Stayz, and sometimes under their own account.</p>
        <ul>
          <li>Good if you want it fully hands-off, or live far from the property.</li>
          <li>Usually includes pricing, guests, cleaning, linen, maintenance and monthly statements.</li>
          <li>Check who owns the listing and reviews, the minimum term and the notice period.</li>
        </ul>
        <h2>Questions to ask either one</h2>
        <ul>
          <li>Whose account is the listing in, and what happens to it if we part ways?</li>
          <li>What’s included in the fee, and what’s charged separately?</li>
          <li>How many homes do you run near my property, and how are they rated?</li>
          <li>Which platforms will you list on?</li>
          <li>How do you handle registration, levies and strata rules in my area?</li>
          <li>Can I block out dates for my own stays?</li>
        </ul>
        <h2>Compare both kinds side by side</h2>
        <p>CoHostCompare lists {m.managers} managers and co-hosts across {m.areas} areas in New South Wales and Victoria. Each profile shows the homes they run near your address, guest ratings and published fees, and you can request quotes from up to five in one go. <Link href="/">Search your address</Link>.</p>
      </>
    ),
  },
  {
    slug: 'how-to-choose-an-airbnb-manager',
    short: 'How to choose an Airbnb manager',
    title: 'How to choose an Airbnb manager in Australia: a checklist',
    description: 'A practical checklist for choosing an Airbnb or short-term rental manager in Australia: local track record, guest ratings, fees and extras, contract terms and compliance.',
    published: '2026-10-02', modified: '2026-10-02',
    faqs: [
      ['What should I look for in an Airbnb manager?', 'Look for a manager who already runs homes near yours with strong guest ratings, a clear fee with the extras spelt out, a fair minimum term and notice period, and a good grasp of the local rules.'],
      ['How many quotes should I get?', 'Getting three to five quotes gives you a fair picture without too much back and forth. CoHostCompare lets you request up to five in one go, in the same format.'],
      ['Do managers pay to appear higher on CoHostCompare?', 'No. Managers can’t pay for placement, ranking or ratings. You choose how results are sorted.'],
    ],
    body: (m) => (
      <>
        <p>The right manager can make a big difference to what your property earns and how well it’s looked after. Use this checklist to compare them on the things that matter.</p>
        <h2>1. A track record near your property</h2>
        <p>Managers who already run homes near you know the local demand, cleaners and trades. On CoHostCompare, each manager shows how many homes they run within 4 km of your address and their guest rating for those homes.</p>
        <h2>2. Guest ratings</h2>
        <p>Guest ratings show how well a manager looks after guests, which drives bookings. Compare the rating near you, not just their overall average.</p>
        <h2>3. The fee, and everything that isn’t in it</h2>
        <p>Ask for the fee and whether GST is added, plus setup fees, cleaning and linen, consumables and maintenance. Across the {m.publishFees} managers we list who publish a fee, the typical fee is {m.fee.mid != null ? `${m.fee.mid}%` : 'quoted on request'}{feeRange(m.fee) ? `, ranging from ${feeRange(m.fee)}` : ''} (updated {fmtDate(m.asOf)}). See <Link href="/guides/airbnb-management-fees-sydney">Airbnb management fees in Sydney</Link>.</p>
        <h2>4. Contract terms</h2>
        <ul>
          <li>Minimum term and notice period</li>
          <li>Who owns the listing and reviews</li>
          <li>Owner stays: can you block out dates?</li>
          <li>How and when you’re paid, and what statements you get</li>
        </ul>
        <h2>5. Rules and compliance</h2>
        <p>Rules differ by state and council. In NSW every short-term rental must be registered and meet a fire safety standard; in Victoria a short stay levy applies. A good manager will explain what applies to your property. See <Link href="/rules">the rules by state</Link>.</p>
        <h2>6. Fit for your property</h2>
        <p>Some managers only take homes available most of the year, certain property types or full management. On CoHostCompare, enter your property details and we only let you add managers whose requirements fit.</p>
        <h2>7. Compare quotes in one format</h2>
        <p>Request quotes from up to five managers at once. Each replies in the same format, so fees, setup costs, terms and what’s included line up side by side. It’s free for owners, and there are no sales calls. <Link href="/">Search your address</Link>.</p>
      </>
    ),
  },
  {
    slug: 'short-stay-rules-nsw',
    short: 'Short-stay rules in NSW',
    title: 'Short-stay rules in NSW: a checklist for Airbnb owners',
    description: 'What NSW owners need to do before listing a short-term rental: registration, the 180-night cap in Greater Sydney, Byron Shire’s 60-night cap, fire safety, the code of conduct and strata by-laws.',
    published: '2026-10-02', modified: '2026-10-02',
    faqs: [
      ['Do I need to register my Airbnb in NSW?', 'Yes. Every short-term rental in NSW must be registered on the NSW Planning Portal’s short-term rental accommodation register before you advertise it.'],
      ['How many nights can I rent out my property in Sydney?', 'Unhosted stays (you don’t live there during the stay) are capped at 180 nights a year in Greater Sydney. Hosted stays aren’t capped, and bookings of 21 or more consecutive nights don’t count toward the cap.'],
      ['What is the night cap in Byron Bay?', 'In most of Byron Shire, unhosted stays are capped at 60 nights a year. Mapped precincts in Byron Bay town centre and Brunswick Heads have no cap.'],
      ['Can my strata ban short-term rentals?', 'A strata scheme can pass a by-law banning short-term rentals in lots that aren’t the owner’s or occupier’s home. Hosted stays can’t be banned this way.'],
    ],
    body: () => (
      <>
        <p>{nsw.summary} Here’s what to do before you list, checked against official NSW Government sources on {RULES_CHECKED}. General information, not legal advice.</p>
        <h2>Checklist</h2>
        <ol>
          {nsw.points.map((p) => <li key={p}>{p}</li>)}
        </ol>
        {nsw.watch && <p className="guide-note"><b>Coming up:</b> {nsw.watch.join(' ')}</p>}
        <h2>What a manager can handle for you</h2>
        <p>A local manager can register the property, keep the fire safety requirements and evacuation plan up to date, give neighbours a contact number, track nights against the cap and stay contactable for guests. Registration and compliance are still your responsibility as the owner, so ask how they handle each one.</p>
        <h2>Official sources</h2>
        <ul>{nsw.sources.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.label}</a></li>)}</ul>
        <p>Own in Victoria too? {vic.summary} <Link href="/rules/vic">Read the Victorian rules</Link>.</p>
      </>
    ),
  },
];

export const guide = (slug: string) => GUIDES.find((g) => g.slug === slug) || null;
