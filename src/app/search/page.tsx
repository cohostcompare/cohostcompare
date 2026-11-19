import type { Metadata } from 'next';
import AddressSearch from '@/components/AddressSearch';
import ResultsList from '@/components/ResultsList';
import { isAdminViewer } from '@/lib/admin';
import Link from 'next/link';
import NotifyForm from './NotifyForm';
import { COVER_KM, closestManagers, managersForArea, managersForPostcode, withTestForAdmin } from '@/lib/data';
import { bump, logSearch } from '@/lib/events';
import { logFunnel } from '@/lib/traffic';
import { earningsHref } from '@/lib/requirements';
import { feeRange, market } from '@/lib/market';

export const metadata: Metadata = { title: 'Managers near you', robots: { index: false } };

type SP = Promise<{ postcode?: string; street?: string; suburb?: string; state?: string; lat?: string; lng?: string }>;

export default async function Search({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const postcode = /^\d{4}$/.test(sp.postcode || '') ? sp.postcode! : '';
  const lat = Number(sp.lat), lng = Number(sp.lng);
  const hasPoint = Number.isFinite(lat) && Number.isFinite(lng) && sp.lat && sp.lng;
  const found = hasPoint ? await managersForArea(lat, lng, postcode) : postcode ? await managersForPostcode(postcode) : [];
  const closest = !found.length && hasPoint ? await closestManagers(lat, lng) : [];
  const { withReviewSummaries } = await import('@/lib/reviews');
  const { withRequirements } = await import('@/lib/requirementsServer');
  const managers = await (await import('@/lib/reach')).withReach(await withRequirements(await withReviewSummaries(await withTestForAdmin(found))));
  await bump(found.map((m) => m.id), 'search');
  if (postcode) await logSearch(postcode, sp.suburb);
  if (postcode || hasPoint) await logFunnel('search');
  const q = new URLSearchParams();
  if (postcode) q.set('postcode', postcode);
  for (const k of ['street', 'suburb', 'state', 'lat', 'lng'] as const) if (sp[k]) q.set(k, sp[k]!);
  const place = sp.street ? `${sp.street}, ${sp.suburb ?? ''}`.replace(/, $/, '') : sp.suburb ? `${sp.suburb} ${postcode}`.trim() : postcode ? `postcode ${postcode}` : '';

  return (
    <main>
      <div className="results-head">
        <div>
          <h1>{managers.length === 0 ? `Managers near ${place || 'this area'}` : `${managers.length} manager${managers.length === 1 ? '' : 's'} near ${place || 'this area'}`}</h1>
          <span className="hint">
            {hasPoint ? `Managers running homes within ${COVER_KM} km. Sort them however you like.` : 'Pick your address from the suggestions for the most accurate results.'} No manager can pay for a higher place.
          </span>
        </div>
      </div>
      {managers.length > 0 ? (
        <ResultsList managers={managers} query={q.toString()} fresh={await isAdminViewer()} feeHint={feeRange((await market()).fee)} />
      ) : (
        <div className="empty" style={{ marginBottom: 32, display: 'grid', gap: 22 }}>
          <div style={{ display: 'grid', gap: 6 }}>
            <h2 style={{ margin: 0, fontSize: 22 }}>No managers run homes within {COVER_KM} km of here yet</h2>
            <p style={{ margin: 0, color: 'var(--muted)' }}>We cover Sydney, Melbourne and NSW and Victorian holiday spots, and add managers every week.</p>
          </div>
          <div style={{ display: 'grid', gap: 8, background: 'var(--tint)', borderRadius: 12, padding: '16px 18px' }}>
            <b>Get told when a manager covers {place || 'this address'}</b>
            <NotifyForm postcode={postcode} place={place} />
          </div>
          {closest.length > 0 && (
            <div style={{ display: 'grid', gap: 8 }}>
              <b>The closest managers we know of</b>
              <ul className="closest">
                {closest.map((m) => <li key={m.slug}><Link href={`/managers/${m.slug}`}>{m.name}</Link><span className="hint">closest home about {Math.round(m.nearestKm!)} km away{m.avgRating != null ? ` · ${m.avgRating.toFixed(2)} ★ guest rating` : ''}</span></li>)}
              </ul>
              <span className="hint">They don&apos;t run homes near this address, so you can&apos;t request a quote from here. Their profiles show where they do work.</span>
            </div>
          )}
          <div style={{ display: 'grid', gap: 8 }}>
            <b>Or try another address or suburb</b>
            <AddressSearch />
          </div>
        </div>
      )}
      <p style={{ margin: '0 0 12px' }}><a className="earn-pill" href={earningsHref({ lat: hasPoint ? lat : null, lng: hasPoint ? lng : null, place })}>What could this property earn? Get a free estimate →</a></p>
      <p className="hint" style={{ margin: '0 0 24px' }}>Ratings, home counts and nightly rates are estimates based on managers&apos; public Airbnb listings over the last 12 months. Fees are a percentage of booking income, shown only where a manager publishes them. For profiles not yet claimed, fees come from the manager&apos;s website, haven&apos;t been confirmed by them, and may or may not include GST. Data source: AirROI (<a href="https://www.airroi.com">www.airroi.com</a>).</p>
    </main>
  );
}
