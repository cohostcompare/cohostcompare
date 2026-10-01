import type { Partner } from '@/lib/partners';

type O = Pick<Partner, 'id' | 'name' | 'category' | 'offer_title' | 'offer_body' | 'promo_code' | 'areas' | 'logo_url' | 'referral_fee'>;
const initials = (n: string) => n.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

/** A partner offer as owners see it on /setup. `preview` renders it without a working link (partner portal, admin). */
export default function OfferCard({ o, preview }: { o: O; preview?: boolean }) {
  return (
    <article className="panel offer">
      <div className="offer-head">
        {o.logo_url ? <img src={o.logo_url} alt="" width={44} height={44} /> : <span className="av" aria-hidden="true" style={{ width: 44, height: 44, fontSize: 15 }}>{initials(o.name || '?')}</span>}
        <div><span className="offer-tag">Partner offer · {o.category}</span><b>{o.name}</b></div>
      </div>
      <h3 style={{ margin: 0, fontSize: 18 }}>{o.offer_title || 'Your offer title'}</h3>
      <p style={{ margin: 0 }}>{o.offer_body || 'Your offer details'}</p>
      {o.promo_code && <p style={{ margin: 0 }}>Code: <b className="code">{o.promo_code}</b></p>}
      {o.areas && <p className="hint" style={{ margin: 0 }}>Available in {o.areas}</p>}
      {preview
        ? <span className="btn secondary small" style={{ justifySelf: 'start', pointerEvents: 'none' }}>Get this offer →</span>
        : <a className="btn secondary small" href={`/go/${o.id}`} rel="sponsored nofollow noopener" target="_blank" style={{ justifySelf: 'start' }}>Get this offer →</a>}
      <p className="hint" style={{ margin: 0, fontSize: 12 }}>{o.referral_fee ? 'We earn a referral fee if you use this offer. It doesn’t change the price you pay.' : 'We don’t earn anything from this offer.'}</p>
    </article>
  );
}
