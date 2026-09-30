// Plain-English summary of short-term rental rules by state. General information, not legal advice.
// Every point links to where it came from. Review and update regularly (last checked below).
export const RULES_CHECKED = '30 September 2026';

export type StateRules = {
  code: string;
  name: string;
  summary: string;
  points: string[];
  watch?: string[];
  sources: { label: string; url: string }[];
};

export const RULES: StateRules[] = [
  {
    code: 'nsw', name: 'New South Wales',
    summary: 'Every short-term rental must be registered, meet a fire safety standard and follow an industry code of conduct. Unhosted stays are capped in Greater Sydney and some regional areas.',
    points: [
      'Register the property on the NSW Planning Portal short-term rental accommodation (STRA) register before listing. The registration fee is $65, and the registration number must appear on your listings.',
      'Unhosted short-term rentals in Greater Sydney are capped at 180 nights a year. Hosted stays (you live there during the stay) are not capped.',
      'Bookings of 21 or more consecutive nights by the same guest don’t count toward the 180-night cap.',
      'In most of Byron Shire, unhosted stays have been capped at 60 nights a year since 26 September 2024. Some precincts in Byron Bay and Brunswick Heads have no cap.',
      'All short-term rentals must meet the STRA fire safety standard: working smoke alarms, clear exits and emergency information.',
      'Hosts and guests must follow the STRA Code of Conduct. Serious or repeated breaches can see a host or guest put on an exclusion register.',
      'Strata schemes can pass a by-law to ban unhosted short-term letting in lots that aren’t the owner’s main home. Check your building’s current by-laws.',
    ],
    sources: [
      { label: 'NSW Government: STRA registration (via business.gov.au)', url: 'https://ablis.business.gov.au/service/nsw/short-term-rental-accommodation-registration/47243' },
      { label: 'NSW Government: changes to Byron Bay short-term rental rules', url: 'https://www.nsw.gov.au/media-releases/changes-to-byron-bay-short-term-rental-rules' },
      { label: 'HomeHost: managing the 180-day cap', url: 'https://www.homehost.com.au/blog/how-to-manage-the-180-day-cap-on-short-term-rentals' },
      { label: 'Houst: NSW STRA register, caps, strata and safety', url: 'https://www.houst.com/blog/airbnb-rules-nsw' },
    ],
  },
  {
    code: 'vic', name: 'Victoria',
    summary: 'A 7.5% short stay levy applies statewide to stays under 28 days. There is no statewide night cap, but councils and owners corporations can have their own rules.',
    points: [
      'Since 1 January 2025, a 7.5% short stay levy applies to stays of less than 28 days.',
      'Booking platforms collect the levy on bookings made through them. Owners who take direct bookings must register with the State Revenue Office and lodge returns themselves.',
      'Your main home (principal place of residence) is exempt, as are hotels and motels.',
      'There is no statewide cap on nights, but your council may have rules, and your owners corporation may have rules for apartments and townhouses.',
    ],
    sources: [
      { label: 'State Revenue Office Victoria: understanding the short stay levy', url: 'https://www.sro.vic.gov.au/owning-property/short-stay-levy/understanding-short-stay-levy' },
      { label: 'HLB Mann Judd: Victoria introduces short stay levy', url: 'https://hlb.com.au/victoria-introduces-short-stay-levy/' },
    ],
  },
  {
    code: 'qld', name: 'Queensland',
    summary: 'There is no statewide registration or cap. Each council sets its own rules, and several are tightening them.',
    points: [
      'Rules are set by each local council, so what applies in Brisbane differs from the Gold Coast, Sunshine Coast or Noosa.',
      'Brisbane City Council has announced a short-term rental permit scheme with limits in low-density suburbs and a 24/7 local contact requirement. Check the council’s website for whether it is in force for your address.',
      'Some councils charge higher rates for homes used for short stays. Noosa requires a permit for short-stay letting.',
      'In apartments and townhouses, check your body corporate by-laws before listing.',
    ],
    watch: ['Brisbane’s permit scheme details were reported by a local operator; confirm the current status with Brisbane City Council.'],
    sources: [
      { label: 'Houst: short-term rental rules in Queensland', url: 'https://www.houst.com/blog/airbnb-regulations-queensland' },
      { label: 'On Call Brisbane: Brisbane short-term rental laws 2026', url: 'https://www.oncallbrisbane.com.au/brisbane-short-term-rental-laws' },
    ],
  },
  {
    code: 'wa', name: 'Western Australia',
    summary: 'Every short-term rental must be on the state register. Unhosted homes in Perth need council approval to operate for more than 90 nights a year.',
    points: [
      'Since 1 January 2026, a property must be on the state’s short-term rental accommodation register to be advertised or booked.',
      'Unhosted homes in the Perth metropolitan area need planning approval from the local council to operate for more than 90 nights a year.',
      'Hosted short stays (you live on site) still need registering but generally don’t need planning approval.',
      'Regional councils can set their own rules, so check with your council outside Perth.',
    ],
    sources: [
      { label: 'Department of Planning WA: STRA planning reforms', url: 'https://www.planning.wa.gov.au/planning-reform/short-term-rental-accommodation-planning-reforms' },
      { label: 'Holdsworth: WA short-stay rules for 2026', url: 'https://holdsworth.com.au/are-you-ready-for-2026-a-guide-to-was-new-short-stay-accommodation-rules/' },
    ],
  },
  {
    code: 'tas', name: 'Tasmania',
    summary: 'Short stays generally need a planning permit depending on the home and zone. Hobart is moving to restrict new whole-home short stays in residential zones.',
    points: [
      'Whether you need a permit depends on your council’s planning scheme and whether you rent your whole home or a room.',
      'On 26 August 2026, Hobart City Council voted to advance a plan to stop new whole-home short stays in general, inner and low-density residential zones. Existing permits aren’t affected. It still needs Tasmanian Planning Commission approval.',
      'Short-stay listings in Tasmania must show a permit or exemption number.',
    ],
    sources: [
      { label: 'ABC News: Hobart council approves plan to restrict short stays (26 Aug 2026)', url: 'https://www.abc.net.au/news/2026-08-26/hobart-council-approves-plan-to-restrict-short-stays/107079522' },
      { label: 'Airbnb Help Centre: Tasmania', url: 'https://www.airbnb.com.mt/help/article/2628' },
    ],
  },
  {
    code: 'sa', name: 'South Australia',
    summary: 'There is no statewide short-term rental register or night cap. Check your council and any strata or community corporation rules.',
    points: ['Rules are mostly set locally. Check with your council and, for apartments, your strata or community corporation.'],
    sources: [{ label: 'Houst: short-term rental rules in Australia', url: 'https://www.houst.com/short-term-rental-management/australia' }],
  },
  {
    code: 'act', name: 'Australian Capital Territory',
    summary: 'There is no specific short-term rental registration or night cap. Normal tax and planning rules apply.',
    points: ['Check the ACT Revenue Office on land tax if the home isn’t your principal place of residence, and your owners corporation rules for units.'],
    sources: [{ label: 'Houst: short-term rental rules in Australia', url: 'https://www.houst.com/short-term-rental-management/australia' }],
  },
  {
    code: 'nt', name: 'Northern Territory',
    summary: 'There is no specific short-term rental registration or night cap. Check local planning and body corporate rules.',
    points: ['Check with your council and body corporate before listing.'],
    sources: [{ label: 'Houst: short-term rental rules in Australia', url: 'https://www.houst.com/short-term-rental-management/australia' }],
  },
];

export function rulesAsText(): string {
  return RULES.map((r) => `## ${r.name} (${r.code.toUpperCase()})\n${r.summary}\n${r.points.map((p) => `- ${p}`).join('\n')}${r.watch ? `\nCaveat: ${r.watch.join(' ')}` : ''}\nSources: ${r.sources.map((s) => `${s.label} <${s.url}>`).join('; ')}`).join('\n\n');
}
