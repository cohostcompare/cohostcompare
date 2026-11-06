import 'server-only';
import { adminClient } from '@/lib/supabase/server';

/*
 IndexNow: tells Bing (which feeds ChatGPT search and Copilot), Yandex, Seznam and Naver about new or changed pages
 straight away instead of waiting for a crawl. The key is public by design: it's served at /<key>.txt (public/).
 Daily cron: managers changed in the last day; on the 1st and 15th, every URL in the sitemap. Production only.
*/
export const INDEXNOW_KEY = '048d3d9b16c29456f1b8544cea1bb3bb';
const HOST = 'www.cohostcompare.com';

export async function pingIndexNow(urls: string[]): Promise<number> {
  if (process.env.VERCEL_ENV !== 'production') return 0;
  const list = [...new Set(urls)].filter((u) => u.startsWith(`https://${HOST}/`)).slice(0, 10000);
  if (!list.length) return 0;
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: HOST, key: INDEXNOW_KEY, keyLocation: `https://${HOST}/${INDEXNOW_KEY}.txt`, urlList: list }),
  });
  if (!res.ok && res.status !== 202) throw new Error(`IndexNow ${res.status}: ${(await res.text()).slice(0, 160)}`);
  return list.length;
}

/** The daily cron step. Returns how many URLs were submitted. */
export async function dailyIndexNow(): Promise<number> {
  const day = Number(new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Sydney', day: 'numeric' }).format(new Date()));
  if (day === 1 || day === 15) {
    const sitemap = (await import('@/app/sitemap')).default;
    return pingIndexNow((await sitemap()).map((e) => e.url));
  }
  const since = new Date(Date.now() - 26 * 3600e3).toISOString();
  const { data } = await adminClient().from('managers').select('slug').eq('published', true).gte('updated_at', since).limit(500);
  return pingIndexNow((data || []).map((m) => `https://${HOST}/managers/${m.slug}`));
}
