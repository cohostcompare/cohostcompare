import type { Metadata } from 'next';
import AddressSearch from '@/components/AddressSearch';
import ResultsList from '@/components/ResultsList';
import { managersForPostcode } from '@/lib/data';

export const metadata: Metadata = { title: 'Managers near you', robots: { index: false } };

type SP = Promise<{ postcode?: string; address?: string; lat?: string; lng?: string }>;

export default async function Search({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const postcode = /^\d{4}$/.test(sp.postcode || '') ? sp.postcode! : '';
  const managers = postcode ? await managersForPostcode(postcode) : [];
  const q = new URLSearchParams();
  if (postcode) q.set('postcode', postcode);
  if (sp.address) q.set('address', sp.address);
  const place = sp.address || (postcode ? `postcode ${postcode}` : '');

  return (
    <main>
      <div className="results-head">
        <div>
          <h1>{managers.length} manager{managers.length === 1 ? '' : 's'} cover {place || 'this area'}</h1>
          <span className="hint">Sorted by guest rating. Paid placement is always labelled.</span>
        </div>
      </div>
      {managers.length > 0 ? (
        <ResultsList managers={managers} query={q.toString()} />
      ) : (
        <div className="empty" style={{ marginBottom: 48 }}>
          <h2 style={{ marginTop: 0, fontSize: 22 }}>No managers cover this address yet</h2>
          <p style={{ color: 'var(--muted)' }}>We&apos;re starting in Sydney and Melbourne and adding managers every week. Try another address, or a nearby postcode.</p>
          <AddressSearch />
        </div>
      )}
    </main>
  );
}
