/** Official CoHostCompare profiles elsewhere. Add each URL once the page exists; they appear in the footer, /about and Google's structured data. */
export const SOCIAL: { name: string; url: string }[] = [
  { name: 'LinkedIn', url: 'https://www.linkedin.com/company/cohostcompare' },
  { name: 'Trustpilot', url: 'https://www.trustpilot.com/review/cohostcompare.com' },
  { name: 'ProductReview', url: 'https://www.productreview.com.au/listings/cohostcompare' },
];

export const ORG_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'CoHostCompare',
  url: 'https://www.cohostcompare.com',
  logo: 'https://www.cohostcompare.com/brand/logo-square.png',
  email: 'hello@cohostcompare.com',
  description: 'Unbiased comparison site where Australian property owners compare short-term rental managers and request quotes from up to five. Free for owners.',
  founder: { '@type': 'Person', name: 'Ben Deeley' },
  foundingDate: '2026',
  areaServed: [{ '@type': 'State', name: 'New South Wales' }, { '@type': 'State', name: 'Victoria' }],
  address: { '@type': 'PostalAddress', addressLocality: 'Sydney', addressRegion: 'NSW', addressCountry: 'AU' },
  identifier: { '@type': 'PropertyValue', propertyID: 'ABN', value: '52679120059' },
  sameAs: SOCIAL.map((s) => s.url),
};
