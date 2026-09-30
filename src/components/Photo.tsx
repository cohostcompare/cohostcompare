/* Stock photos from Unsplash (free for commercial use under the Unsplash License; no credit required).
   Served from Unsplash's image CDN at the size each layout needs. No landmarks with image-use restrictions. */
export const PHOTOS = {
  bondi: { id: 'photo-1689834680023-34882df43a7c', alt: 'Aerial view of Bondi Beach in Sydney, with homes and apartments along the shore', by: 'Rilla Paris' },
  sydney: { id: 'photo-1743032254153-9e7cd0f7ffd8', alt: 'Sydney Harbour Bridge and North Sydney on a sunny day', by: 'Jim Ouk' },
  melbourne: { id: 'photo-1514395462725-fb4566210144', alt: 'Flinders Street Station in Melbourne', by: 'XY Yew' },
  yarra: { id: 'photo-1596527199903-6cdaacee1208', alt: 'The Yarra River and Melbourne city skyline', by: 'Paul Macallan' },
  bed: { id: 'photo-1712227552198-8d304299351f', alt: 'A freshly made bed with folded towels, ready for guests', by: 'Maria Sime' },
  keys: { id: 'photo-1741156386380-0236c72eb6f9', alt: 'Holding house keys at the front door of a home', by: 'Jakub Żerdzicki' },
  making: { id: 'photo-1686828751885-040f0a0fb77a', alt: 'Making a bed between guest stays', by: 'Slaapwijsheid.nl' },
} as const;

export type PhotoName = keyof typeof PHOTOS;
const src = (id: string, w: number) => `https://images.unsplash.com/${id}?auto=format&fit=crop&q=70&w=${w}`;

export default function Photo({ name, ratio = '4 / 3', sizes = '(max-width: 880px) 100vw, 50vw', eager, credit = false, style }: {
  name: PhotoName; ratio?: string; sizes?: string; eager?: boolean; credit?: boolean; style?: React.CSSProperties;
}) {
  const p = PHOTOS[name];
  return (
    <figure className="photo" style={style}>
      <img src={src(p.id, 1200)} srcSet={[480, 800, 1200, 1800].map((w) => `${src(p.id, w)} ${w}w`).join(', ')} sizes={sizes}
        alt={p.alt} loading={eager ? 'eager' : 'lazy'} decoding="async" style={{ aspectRatio: ratio }} />
      {credit && <figcaption>Photo: {p.by} / Unsplash</figcaption>}
    </figure>
  );
}
