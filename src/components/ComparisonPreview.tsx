/** Homepage picture of what a comparison looks like. Made-up example managers (not real businesses), clearly labelled. */
const EXAMPLES = [
  { name: 'Tidewell Stays', initials: 'TS', fee: '18%', rating: '4.92', homes: 24, platforms: 'Airbnb, Stayz, Booking.com', tag: 'Highest rating nearby' },
  { name: 'Kelpie Coast Hosting', initials: 'KC', fee: '15%', rating: '4.81', homes: 11, platforms: 'Airbnb, Stayz', tag: 'Lowest fee' },
  { name: 'Harbourline Stays', initials: 'HS', fee: '20%', rating: '4.88', homes: 37, platforms: 'Airbnb, Booking.com', tag: 'Most homes nearby' },
];
const TILE = ['#0F5E57', '#7A4504', '#3D4E8A'];

export default function ComparisonPreview() {
  return (
    <figure className="cmp-preview" aria-label="Example of a comparison, with made-up managers">
      <div className="cmp-preview-head">
        <b>3 managers near you</b>
        <span className="hint">Sorted by guest rating near you</span>
      </div>
      <div className="cmp-preview-cards">
        {EXAMPLES.map((m, i) => (
          <div key={m.name} className="cmp-preview-card">
            <div className="cmp-preview-name"><span className="av" style={{ background: TILE[i], color: '#fff' }} aria-hidden="true">{m.initials}</span><b>{m.name}</b></div>
            <dl>
              <div><dt>Fee</dt><dd>{m.fee}</dd></div>
              <div><dt>Guest rating nearby</dt><dd>{m.rating} ★</dd></div>
              <div><dt>Homes nearby</dt><dd>{m.homes}</dd></div>
              <div className="wide"><dt>Platforms</dt><dd>{m.platforms}</dd></div>
            </dl>
            <span className="cmp-preview-fact">{m.tag}</span>
          </div>
        ))}
      </div>
    </figure>
  );
}
