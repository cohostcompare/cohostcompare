'use client';

/** Homepage picture of the results page: made-up managers (never real businesses), laid out like the real rows. One has no published fee, as most don't. */
const EXAMPLES = [
  { name: 'Tidewell Stays', initials: 'TS', fee: '18%', rating: '4.92', homes: 24, tag: 'Highest guest rating near you', picked: true },
  { name: 'Kelpie Coast Hosting', initials: 'KC', fee: null, rating: '4.81', homes: 11, tag: 'Replies on CoHostCompare', picked: true },
  { name: 'Harbourline Stays', initials: 'HS', fee: '20%', rating: '4.88', homes: 37, tag: 'Most homes near you', picked: false },
];

/** Clicking the picture points people to the real search: the address box pulses and its placeholder goes bold. */
function nudgeSearch() {
  const box = document.querySelector<HTMLElement>('.hero-search');
  if (!box) return;
  const r = box.getBoundingClientRect();
  if (r.top < 0 || r.bottom > window.innerHeight) box.scrollIntoView({ behavior: 'smooth', block: 'center' });
  box.classList.remove('flash'); void box.offsetWidth; box.classList.add('flash');
  window.setTimeout(() => box.classList.remove('flash'), 1800);
  if (window.matchMedia('(hover: hover)').matches) box.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true });
}

export default function ComparisonPreview() {
  return (
    <figure className="rp" aria-label="Picture of a results page, with made-up managers" onClick={nudgeSearch}>
      <span className="rp-label">What your results look like</span>
      <div className="rp-window" aria-hidden="true">
        <div className="rp-body">
          <div className="rp-head"><b>Top 3 of 24 for this address</b><span>Sort: Recommended ▾</span></div>
          {EXAMPLES.map((m) => (
            <div key={m.name} className={`rp-card${m.picked ? ' on' : ''}`}>
              <div className="rp-top">
                <span className="rp-av">{m.initials}</span>
                <div className="rp-main"><b>{m.name}</b><span className="rp-tag">{m.tag}</span></div>
                <span className={`rp-btn${m.picked ? ' done' : ''}`}>{m.picked ? '✓ Added' : '+ Add'}</span>
              </div>
              <div className="rp-stats">
                <span><b>{m.homes}</b>Homes near you</span>
                <span><b>{m.rating}<small> ★</small></b>Guest rating</span>
                <span>{m.fee ? <b>{m.fee}</b> : <b className="req">On request</b>}Fee</span>
              </div>
            </div>
          ))}
          <div className="rp-bar">
            <span><b>2 of 5 picked</b></span>
            <span className="rp-btn primary">Request 2 quotes →</span>
          </div>
        </div>
      </div>
    </figure>
  );
}
