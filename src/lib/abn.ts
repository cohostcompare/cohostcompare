import 'server-only';

export type AbnResult = { ok: true; abn: string; active: boolean; names: string[] } | { ok: false; error: string };

export const cleanAbn = (s: string) => s.replace(/\D/g, '');

/** ABN checksum (ATO algorithm). */
export function validAbn(abn: string) {
  if (!/^\d{11}$/.test(abn)) return false;
  const w = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
  const d = abn.split('').map(Number); d[0] -= 1;
  return d.reduce((s, n, i) => s + n * w[i], 0) % 89 === 0;
}

/** Looks the ABN up on the Australian Business Register (free ABN Lookup web service; needs ABN_LOOKUP_GUID). */
export async function lookupAbn(raw: string): Promise<AbnResult> {
  const abn = cleanAbn(raw);
  if (!validAbn(abn)) return { ok: false, error: 'That isn’t a valid ABN. Check the 11 digits.' };
  const guid = (process.env.ABN_LOOKUP_GUID || '').trim();
  if (!guid) return { ok: false, error: 'ABN checking isn’t switched on yet. We’ll verify it by hand.' };
  const r = await fetch(`https://abr.business.gov.au/json/AbnDetails.aspx?abn=${abn}&callback=cb&guid=${guid}`, { cache: 'no-store' });
  const text = await r.text();
  const json = JSON.parse(text.replace(/^[^(]*\(/, '').replace(/\);?\s*$/, '')) as { Abn?: string; AbnStatus?: string; EntityName?: string; BusinessName?: string[]; Message?: string };
  if (!json.Abn) return { ok: false, error: json.Message || 'We couldn’t find that ABN.' };
  return { ok: true, abn, active: json.AbnStatus === 'Active', names: [json.EntityName, ...(json.BusinessName || [])].filter(Boolean) as string[] };
}

const norm = (s: string) => s.toLowerCase().replace(/pty|ltd|limited|the|trust|trustee|for|&|and/g, ' ').replace(/[^a-z0-9]+/g, '');

/** Does any registered name match the manager's name closely enough? */
export function namesMatch(manager: string, names: string[]) {
  const m = norm(manager);
  return m.length >= 4 && names.some((n) => { const x = norm(n); return x.length >= 4 && (x.includes(m) || m.includes(x)); });
}
