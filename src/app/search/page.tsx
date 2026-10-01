import type { Metadata } from 'next';
import AddressSearch from '@/components/AddressSearch';
import ResultsList from '@/components/ResultsList';
import { COVER_KM, managersForArea, managersForPostcode, withTestForAdmin } from '@/lib/data';
import { bump, logSearch } from '@/lib/events';
import { logFunnel } from '@/lib/traffic';

export const metadata: Metadata = { title: 'Managers near you', robots: { index: false } };

type SP = Promise<{ postcode?: string; street?: string; suburb?: string; state?: string; lat?: string; lng?: string }>;

export default async function Search({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const postcode = /^\d{4}$/.test(sp.postcode || '') ? sp.postcode! : '';
  const lat = Number(sp.lat), lng = Number(sp.lng);
  const hasPoint = Number.isFinite(lat) && Number.isFinite(lng) && sp.lat && sp.lng;
  const found = hasPoint ? await managersForArea(lat, lng, postcode) : postcode ? await managersForPostcode(postcode) : [];
  const { withReviewSummaries } = await import('@/lib/reviews');
  const managers = await withReviewSummaries(await withTestForAdmin(found));
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
          <h1>{managers.length} manager{managers.length === 1 ? '' : 's'} near {place || 'this area'}</h1>
          <span className="hint">
            {hasPoint ? `Managers running homes within ${COVER_KM} km, most active nearby first.` : 'Pick your address from the suggestions for the most accurate results.'} No manager can pay for a higher place.
          </span>
        </div>
      </div>
      {managers.length > 0 ? (
        <ResultsList managers={managers} query={q.toString()} />
      ) : (
        <div className="empty" style={{ marginBottom: 48 }}>
          <h2 style={{ marginTop: 0, fontSize: 22 }}>No managers found near here yet</h2>
          <p style={{ color: 'var(--muted)' }}>We cover Sydney, Melbourne and NSW and Victorian holiday spots, and add managers every week. Try another address or a nearby suburb, picking it from the suggestions.</p>
          <AddressSearch />
        </div>
      )}
      <p style={{ margin: '0 0 12px' }}><a href="/earnings"><b>What could this property earn? Get a free estimate →</b></a></p>
      <p className="hint" style={{ margin: '0 0 24px' }}>Ratings, home counts and nightly rates are estimates based on managers&apos; public Airbnb listings over the last 12 months. Fees are shown only where a manager publishes them. For profiles not yet claimed, fees come from the manager&apos;s website and haven&apos;t been confirmed by them. Data source: AirROI (<a href="https://www.airroi.com">www.airroi.com</a>).</p>
    </main>
  );
}
