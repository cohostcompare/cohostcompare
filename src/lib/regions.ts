import type { Area } from '@/lib/areas';

/** Regions group sweep areas for quarterly reports. Unlisted areas become a region of their own. */
const REGIONS: [string, string, string[]][] = [
  ['sydney-eastern-suburbs', 'Sydney Eastern Suburbs', ['syd-bondi', 'syd-coogee']],
  ['inner-sydney', 'Inner Sydney', ['syd-cbd', 'syd-surry-hills', 'syd-newtown']],
  ['sydney-northern-beaches', 'Sydney Northern Beaches', ['syd-manly']],
  ['inner-melbourne', 'Inner Melbourne', ['mel-cbd', 'mel-fitzroy', 'mel-richmond', 'mel-st-kilda']],
  ['northern-rivers', 'Northern Rivers', ['nsw-byron-bay', 'nsw-brunswick-heads', 'nsw-lennox-head', 'nsw-yamba']],
  ['mid-north-coast', 'Mid North Coast', ['nsw-coffs-harbour', 'nsw-port-macquarie']],
  ['hunter-port-stephens', 'Hunter and Port Stephens', ['nsw-port-stephens', 'nsw-newcastle', 'nsw-hunter-valley']],
  ['central-coast', 'Central Coast', ['nsw-terrigal']],
  ['blue-mountains', 'Blue Mountains', ['nsw-blue-mountains']],
  ['nsw-south-coast', 'NSW South Coast', ['nsw-kiama', 'nsw-jervis-bay', 'nsw-mollymook', 'nsw-batemans-bay', 'nsw-merimbula']],
  ['snowy-mountains', 'Snowy Mountains', ['nsw-jindabyne', 'nsw-thredbo']],
  ['great-ocean-road', 'Great Ocean Road and Surf Coast', ['vic-torquay', 'vic-lorne', 'vic-apollo-bay', 'vic-port-fairy']],
  ['bellarine', 'Bellarine Peninsula', ['vic-ocean-grove', 'vic-queenscliff']],
  ['daylesford', 'Daylesford and Hepburn', ['vic-daylesford']],
  ['yarra-valley', 'Yarra Valley', ['vic-yarra-valley']],
  ['high-country', 'Victorian High Country', ['vic-bright']],
  ['gippsland', 'Gippsland', ['vic-inverloch', 'vic-lakes-entrance']],
];

export type Region = { slug: string; label: string; state: 'nsw' | 'vic'; areas: Area[] };

export function regionsOf(areas: Area[]): Region[] {
  const out: Region[] = [];
  const used = new Set<string>();
  for (const [slug, label, ids] of REGIONS) {
    const as = areas.filter((a) => ids.includes(a.id));
    if (!as.length) continue;
    as.forEach((a) => used.add(a.id));
    out.push({ slug, label, state: ids[0].startsWith('mel') || ids[0].startsWith('vic') ? 'vic' : 'nsw', areas: as });
  }
  for (const a of areas) if (!used.has(a.id)) out.push({ slug: `area-${a.slug}`, label: a.label, state: /^(mel|vic)-/.test(a.id) ? 'vic' : 'nsw', areas: [a] });
  return out;
}
