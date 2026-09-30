// Plain-English summary of short-term rental rules by state. General information, not legal advice.
// Every point is backed by an official government source (state, territory or council). No blogs or industry sites. Review and update regularly (last checked below).
export const RULES_CHECKED = '1 October 2026';
export const RULES_CHECKED_ISO = '2026-10-01'; // keep in step with RULES_CHECKED
/** Days since the rules were last checked against official sources. Over 45 = overdue for review. */
export const rulesAgeDays = () => Math.floor((Date.now() - new Date(`${RULES_CHECKED_ISO}T00:00:00+10:00`).getTime()) / 86400e3);
export const RULES_STALE_DAYS = 45;

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
    summary: 'Every short-term rental must be registered, meet a fire safety standard and follow a mandatory code of conduct. Unhosted stays are capped at 180 nights a year in Greater Sydney and some regional areas, and 60 nights in most of Byron Shire.',
    points: [
      'Register the property on the NSW Planning Portal short-term rental accommodation (STRA) register before you advertise it. Registration costs $65, with a $25 renewal each year.',
      'Unhosted stays (you don’t live there during the stay) are capped at 180 nights a year in Greater Sydney, and in parts of Ballina, Clarence Valley and Muswellbrook. Hosted stays aren’t capped.',
      'Bookings of 21 or more consecutive nights don’t count toward the cap.',
      'In most of Byron Shire, unhosted stays are capped at 60 nights a year, from 23 September 2024 or your first renewal after that. Mapped precincts in Byron Bay town centre and Brunswick Heads have no cap.',
      'The property must meet the STRA fire safety standard, including interconnected smoke alarms and an evacuation plan.',
      'Hosts must follow the Fair Trading code of conduct: give guests contact and emergency details, tell direct neighbours how to reach you, hold insurance for third-party injury or death that covers each stay, and be contactable from 8 am to 5 pm every day and for emergencies after hours. Serious breaches can put a host or guest on the exclusion register.',
      'Strata schemes can pass a by-law banning short-term rentals in lots that aren’t the owner’s or occupier’s home. Hosted stays can’t be banned this way.',
    ],
    watch: ['The NSW Government is reviewing the STRA rules. No changes have been announced as law yet.'],
    sources: [
      { label: 'NSW Department of Planning, Housing and Infrastructure: short-term rental accommodation', url: 'https://www.planning.nsw.gov.au/the-planning-system/housing/short-term-rental-accommodation' },
      { label: 'NSW Department of Planning, Housing and Infrastructure: Byron Shire', url: 'https://www.planning.nsw.gov.au/policy-and-legislation/housing/short-term-rental-accommodation/byron-shire' },
      { label: 'NSW Government: host obligations for short-term rental accommodation', url: 'https://www.nsw.gov.au/housing-and-construction/short-term-rental-accommodation/host-obligations' },
    ],
  },
  {
    code: 'vic', name: 'Victoria',
    summary: 'A 7.5% short stay levy applies to stays of less than 28 consecutive days. There is no statewide night cap, but apartment and townhouse owners corporations can vote to ban short stays.',
    points: [
      'Since 1 January 2025, a 7.5% levy applies to short stays of less than 28 consecutive days.',
      'If you only take bookings through platforms such as Airbnb or Stayz, the platform registers for and pays the levy. If you take direct bookings, you must register with the State Revenue Office and lodge returns yourself.',
      'The levy doesn’t apply to a stay in someone’s principal place of residence (owned or rented), or to commercial residential premises such as hotels and motels. Owners can give booking platforms a declaration that their premises are excluded.',
      'If you’re unsure whether the levy applies, check the State Revenue Office’s guidance or ask it for a private ruling.',
      'An owners corporation can ban short stays in its building by special resolution (75% of lot owners). The ban can’t apply to a lot that is the owner’s or occupier’s principal place of residence.',
      'There is no statewide cap on nights. Check your council for any local planning rules.',
    ],
    sources: [
      { label: 'State Revenue Office Victoria: short stay levy', url: 'https://www.sro.vic.gov.au/owning-property/short-stay-levy' },
      { label: 'State Revenue Office Victoria: short stay levy registration', url: 'https://www.sro.vic.gov.au/news/short-stay-levy-registration-now-open' },
      { label: 'State Revenue Office Victoria: short stay levy applies from 1 January 2025', url: 'https://www.sro.vic.gov.au/about-us/news-and-events/news/short-stay-levy-applies-1-january-2025' },
      { label: 'State Revenue Office Victoria: declaration that premises are not short stay accommodation', url: 'https://www.sro.vic.gov.au/owning-property/short-stay-levy/complete-declaration-premises-are-not-short-stay-accommodation' },
      { label: 'Alpine Resorts Victoria: short stay levy update', url: 'https://www.alpineresorts.vic.gov.au/news/short-stay-levy-update' },
      { label: 'Consumer Affairs Victoria: making rules to ban short stay accommodation', url: 'https://www.consumer.vic.gov.au/housing/owners-corporations/rules/making-rules-to-ban-short-stay-accommodation' },
    ],
  },
  {
    code: 'qld', name: 'Queensland',
    summary: 'There is no statewide registration or night cap. Each council sets its own rules, and they vary a lot, so check yours before you list.',
    points: [
      'The Queensland Government has left short-term rentals to local councils rather than setting statewide restrictions.',
      'Brisbane City Council decided not to go ahead with its proposed Short Stay Accommodation Local Law 2025. Existing local laws still apply.',
      'Noosa requires a local law approval for short stay letting, renewed every year. For a house it costs $1,748 to apply and $800 a year to renew (2026–27 fees). You also need a contact person within 20 km who responds to complaints within 30 minutes, 24/7.',
      'Other councils, including the Gold Coast and Sunshine Coast, have their own planning rules and may rate short-stay homes differently. Check with your council.',
      'In apartments and townhouses, check your body corporate by-laws before listing.',
    ],
    sources: [
      { label: 'Queensland Department of Planning: short-term rental accommodation review', url: 'https://www.planning.qld.gov.au/planning-issues-and-interests/short-term-rental-accommodation-review' },
      { label: 'Brisbane City Council: proposed Short Stay Accommodation Local Law 2025', url: 'https://www.brisbane.qld.gov.au/laws-and-permits/local-laws/community-consultation-and-new-local-laws/proposed-short-stay-accommodation-local-law-2025' },
      { label: 'Noosa Council: short stay letting', url: 'https://www.noosa.qld.gov.au/Planning-and-Development/Short-stay-letting-and-home-hosted-accommodation-local-law/Short-stay-letting' },
      { label: 'Noosa Council: short stay applications, fees and renewals', url: 'https://www.noosa.qld.gov.au/Planning-and-Development/Short-stay-letting-and-home-hosted-accommodation-local-law/Applications-fees-and-renewals' },
    ],
  },
  {
    code: 'wa', name: 'Western Australia',
    summary: 'Every short-term rental, hosted or unhosted, must be on the state register. Unhosted homes in Perth need council approval to be let for more than 90 nights a year.',
    points: [
      'Since 1 January 2025, all short-term rentals in WA, hosted and unhosted, must be registered on the state STRA register before you advertise or take bookings. Registration costs $250, then $100 to renew each year.',
      'Your registration number must be clearly shown on every advertisement.',
      'In the Perth metropolitan area, an unhosted home can be let for up to 90 nights in a 12-month period without planning approval. Beyond that, you need development approval from your council before operating.',
      'Hosted stays (you live there during the stay) don’t need planning approval anywhere in WA, but still need registering.',
      'Outside Perth, each council decides whether unhosted short stays need planning approval, so check with yours.',
    ],
    sources: [
      { label: 'WA Government: short-term rental accommodation register', url: 'https://www.wa.gov.au/organisation/department-of-local-government-industry-regulation-and-safety/short-term-rental-accommodation-register' },
      { label: 'WA Government: STRA register frequently asked questions', url: 'https://www.wa.gov.au/organisation/department-of-local-government-industry-regulation-and-safety/short-term-rental-accommodation-register-frequently-asked-questions' },
      { label: 'WA Government: STRA registration and fees', url: 'https://www.wa.gov.au/organisation/department-of-energy-mines-industry-regulation-and-safety/registration-and-fees' },
      { label: 'Consumer Protection WA: managing short-term rental accommodation', url: 'https://www.consumerprotection.wa.gov.au/managing-short-term-rental-accommodation' },
      { label: 'WA Department of Planning: STRA planning reforms', url: 'https://www.planning.wa.gov.au/planning-reform/short-term-rental-accommodation-planning-reforms' },
    ],
  },
  {
    code: 'tas', name: 'Tasmania',
    summary: 'Letting a home that isn’t your main residence as a short stay generally needs a planning permit. You must give booking platforms your permit or exemption details.',
    points: [
      'You don’t need a planning permit if you let your own home only while you’re on holiday or temporarily away, or if you live there and host guests in no more than four bedrooms.',
      'Otherwise, you generally need a planning permit before operating a short stay in residential and similar zones.',
      'Under the Short Stay Accommodation Act 2019, you must give booking platforms your permit number or exemption status, the full address, the number of guest bedrooms and whether it’s your main residence.',
      'In Hobart, check your body corporate rules if the property is in a strata scheme. The council charges a different rate for homes with a planning permit for visitor accommodation.',
      'There is no Tasmanian short stay levy. A proposed 5% levy (the Short Stay Levy Bill 2026) was defeated in the Legislative Council on 9 September 2026.',
    ],
    watch: ['In August 2026, Hobart City Council voted to seek a planning scheme change that would stop new whole-home short stays in most residential zones. Existing permits wouldn’t be affected. It needs Tasmanian Planning Commission approval before it applies.'],
    sources: [
      { label: 'Tasmanian State Planning Office: short stay accommodation fact sheet (September 2025)', url: 'https://www.stateplanning.tas.gov.au/__data/assets/pdf_file/0009/605718/Short-Stay-Accommodation-fact-sheet-September-2025.PDF' },
      { label: 'Consumer, Building and Occupational Services Tasmania: short and medium term visitor accommodation', url: 'https://cbos.tas.gov.au/topics/housing/short-and-medium-term-visitor-accommodation' },
      { label: 'Tasmanian Department of Treasury and Finance: Short Stay Levy Bill', url: 'https://www.treasury.tas.gov.au/economy/short-stay-levy-bill-2025-consultation' },
      { label: 'City of Hobart: visitor accommodation (Airbnb)', url: 'https://www.hobartcity.com.au/Development/Planning/Planning-guidelines-and-help/Visitor-accommodation-Airbnb' },
    ],
  },
  {
    code: 'sa', name: 'South Australia',
    summary: 'There is currently no statewide short-term rental register or night cap. Check your council and any strata or community corporation rules.',
    points: [
      'Rules are mostly set locally, so check with your council whether you need development approval.',
      'For apartments and townhouses, check your strata or community corporation’s rules.',
    ],
    watch: ['The SA Government plans a statewide short-stay accommodation register with a code of conduct. Consumer and Business Services is consulting until 5 pm on 30 October 2026. It isn’t law yet, and no start date has been set.'],
    sources: [
      { label: 'YourSAy: short stay accommodation register consultation', url: 'https://yoursay.sa.gov.au/short-stay-accommodation-register' },
      { label: 'Parliament of South Australia: Select Committee on the Short Stay Accommodation Sector', url: 'https://www.parliament.sa.gov.au/en/News/2025/03/05/02/13/SUBMISSIONS-OPEN-Select-Committee-on-Short-Stay-Accommodation-Sector' },
    ],
  },
  {
    code: 'act', name: 'Australian Capital Territory',
    summary: 'A 5% levy applies to unhosted short-term rental bookings made through platforms, rising to 7.5% from 1 July 2027. There is no registration scheme or night cap.',
    points: [
      'Since 1 July 2025, a 5% levy applies to bookings of not more than 28 continuous days for unhosted, self-contained homes made through a booking platform. The rate rises to 7.5% from 1 July 2027.',
      'The booking platform pays the levy, not the owner. Direct bookings with the owner and hosted stays (you stay there at the same time as guests) aren’t covered. There is no general exemption for your principal place of residence.',
      'If the home isn’t your principal place of residence, check whether land tax applies, and check your owners corporation rules for units.',
    ],
    sources: [
      { label: 'ACT Revenue Office: short-term rental accommodation levy', url: 'https://www.revenue.act.gov.au/business-taxes-and-levies/short-term-rental-accommodation-levy' },
      { label: 'ACT Revenue Office: ACT Budget 2026–27 updates', url: 'https://www.revenue.act.gov.au/about-the-act-revenue-office/news/act-budget-2026-27-updates' },
      { label: 'ACT Government: short-term rental accommodation levy announcement', url: 'https://www.cmtedd.act.gov.au/open_government/inform/act_government_media_releases/chris-steel-mla-media-releases/2025/short-term-rental-accommodation-levy-to-be-introduced-in-the-act' },
      { label: 'ACT Revenue Office: land tax', url: 'https://www.revenue.act.gov.au/land-tax' },
    ],
  },
  {
    code: 'nt', name: 'Northern Territory',
    summary: 'There is no specific short-term rental registration scheme or night cap. Larger operations may need to register as a commercial accommodation business.',
    points: [
      'If you accommodate seven or more paying visitors, you may need to register as a commercial visitor accommodation business. Small bed and breakfasts are excluded. Registration or renewal costs $372.',
      'Check the NT Planning Scheme for whether your use needs a development permit, and your body corporate rules for units.',
    ],
    sources: [
      { label: 'NT Government: register a commercial visitor accommodation', url: 'https://nt.gov.au/industry/hospitality/accommodation-and-food-businesses/register-accommodation-business' },
      { label: 'NT Government: NT Planning Scheme 2020', url: 'https://nt.gov.au/property/land-planning-and-development/our-planning-system/nt-planning-scheme' },
    ],
  },
];

export function rulesAsText(): string {
  return RULES.map((r) => `## ${r.name} (${r.code.toUpperCase()})\n${r.summary}\n${r.points.map((p) => `- ${p}`).join('\n')}${r.watch ? `\nCaveat: ${r.watch.join(' ')}` : ''}\nSources: ${r.sources.map((s) => `${s.label} <${s.url}>`).join('; ')}`).join('\n\n');
}
