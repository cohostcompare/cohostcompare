/** Structured data helpers (schema.org JSON-LD). Never add star ratings: our figures are estimates, not reviews of us. */
export const SITE = 'https://www.cohostcompare.com';

export const breadcrumbs = (items: [string, string][]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: path === '/' ? SITE : `${SITE}${path}` })),
});

export const faqPage = (faqs: [string, string][]) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
});

export const itemList = (name: string, items: { name: string; path: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name,
  itemListElement: items.map((x, i) => ({ '@type': 'ListItem', position: i + 1, name: x.name, url: `${SITE}${x.path}` })),
});

export const article = (a: { title: string; description: string; path: string; published: string; modified: string }) => ({
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: a.title,
  description: a.description,
  url: `${SITE}${a.path}`,
  mainEntityOfPage: `${SITE}${a.path}`,
  datePublished: a.published,
  dateModified: a.modified,
  inLanguage: 'en-AU',
  author: { '@type': 'Organization', name: 'CoHostCompare', url: SITE },
  publisher: { '@type': 'Organization', name: 'CoHostCompare', url: SITE, logo: { '@type': 'ImageObject', url: `${SITE}/brand/logo-square.png` } },
});

/** Meta descriptions: at most ~160 characters, cut at the last full sentence that fits (or a word, with an ellipsis). */
export function metaDescription(text: string, max = 160) {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const head = t.slice(0, max);
  const sentence = Math.max(head.lastIndexOf('. '), head.lastIndexOf('.'), head.lastIndexOf('! '), head.lastIndexOf('? '));
  if (sentence >= max * 0.5) return head.slice(0, sentence + 1).trim();
  return `${head.slice(0, head.lastIndexOf(' ')).trim()}…`;
}

/** One line used everywhere we describe ourselves (site, llms.txt, structured data). Keep them consistent. */
export const POSITIONING = 'CoHostCompare is a free, unbiased Australian comparison site where property owners compare short-term rental (Airbnb) managers and co-hosts that cover their address, then request quotes from up to five in one standard format. Managers cannot pay for placement or ranking.';
