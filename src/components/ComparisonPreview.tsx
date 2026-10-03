/** Homepage picture of the results page: made-up managers (never real businesses), shown as an app window with what you can do next. */
const EXAMPLES = [
  { name: 'Tidewell Stays', initials: 'TS', fee: '18%', rating: '4.92', homes: 24, platforms: 'Airbnb · Stayz · Booking.com', tag: 'Highest rating nearby', picked: true },
  { name: 'Kelpie Coast Hosting', initials: 'KC', fee: '15%', rating: '4.81', homes: 11, platforms: 'Airbnb · Stayz', tag: 'Lowest fee', picked: true },
  { name: 'Harbourline Stays', initials: 'HS', fee: '20%', rating: '4.88', homes: 37, platforms: 'Airbnb · Booking.com', tag: 'Most homes nearby', picked: false },
];
const TILE = ['#0F5E57', '#9A5A06', '#3D4E8A'];

export default function ComparisonPreview() {
  return (
    <figure className="rp" aria-label="Picture of a results page, with made-up managers">
      <span className="rp-label">What your results look like</span>
      <div className="rp-window" aria-hidden="true">
        <div className="rp-chrome"><i /><i /><i /><span>cohostcompare.com/search</span></div>
        <div className="rp-body">
          <div className="rp-head"><b>3 managers near you</b><span>Sort: guest rating near you ▾</span></div>
          {EXAMPLES.map((m, i) => (
            <div key={m.name} className={`rp-card${m.picked ? ' on' : ''}`}>
              <span className="rp-av" style={{ background: TILE[i] }}>{m.initials}</span>
              <div className="rp-main">
                <b>{m.name}</b>
                <span className="rp-meta"><b>{m.homes}</b> homes · <b>{m.rating} ★</b> guest rating nearby</span>
                <span className="rp-meta">{m.platforms}</span>
                <span className="rp-tag">{m.tag}</span>
              </div>
              <div className="rp-side">
                <span className="rp-fee">{m.fee}<small>fee</small></span>
                <span className={`rp-btn${m.picked ? ' done' : ''}`}>{m.picked ? '✓ Added' : '+ Add to quote'}</span>
              </div>
            </div>
          ))}
          <div className="rp-bar">
            <span><b>2 of 5 picked</b></span>
            <span className="rp-actions"><span className="rp-link">Compare side by side</span><span className="rp-btn primary">Request 2 quotes →</span></span>
          </div>
        </div>
      </div>
    </figure>
  );
}
