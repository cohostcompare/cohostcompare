import 'server-only';
import { TEST_SLUG } from '@/lib/data';
import { sendEmail } from '@/lib/email';
import { memberEmails } from '@/lib/managers';
import { suppressed, unsubscribeUrl } from '@/lib/outreach';
import { isPro, plansFor } from '@/lib/pro';
import { adminClient } from '@/lib/supabase/server';

/*
 Manager onboarding (daily cron, SQL 022): three short emails after a manager claims their profile.
 1. Day 2: finish your profile (only the items still missing; skipped if it's complete)
 2. Day 6: requirements, alerts and quote templates, so the right requests arrive and replies are fast
 3. Day 12: how owners choose, and what Pro adds
*/
const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cohostcompare.com';
const DAYS = [2, 6, 12];

type M = { id: string; slug: string; name: string; tagline: string | null; about: string | null; fee_min: number | null; services: string[] | null; logo_url: string | null; photos: string[] | null; contact_phone: string | null; requirements?: unknown; onboarding_step: number; onboarding_at: string | null };

function missing(m: M) {
  return [
    !m.tagline && 'a short tagline',
    (m.about || '').length < 80 && 'an about section (a few sentences on how you work)',
    m.fee_min == null && 'your management fee',
    !(m.services || []).length && 'the services you offer',
    !m.logo_url && 'your logo',
    (m.photos || []).length < 3 && 'at least 3 photos of homes you manage',
    !m.contact_phone && 'a phone number for owners who accept your quote',
  ].filter(Boolean) as string[];
}

type Mail = { subject: string; text: string; cta: { label: string; url: string }; from: string };
/** One email per person, each with their own unsubscribe link (Spam Act). Returns how many went. */
async function mail(to: string[], e: Mail) {
  let n = 0;
  for (const addr of to) {
    const ok = await sendEmail({ ...e, to: addr, text: `${e.text}\n\nDon't want tips like these? ${unsubscribeUrl(addr)}`, headers: { 'List-Unsubscribe': `<${unsubscribeUrl(addr, true)}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } });
    if (ok) n++;
  }
  return n;
}

export async function runOnboarding(limit = 30) {
  const db = adminClient();
  const { data, error } = await db.from('managers').select('id, slug, name, tagline, about, fee_min, services, logo_url, photos, contact_phone, requirements, onboarding_step, onboarding_at').eq('claimed', true).lt('onboarding_step', 3).neq('slug', TEST_SLUG).limit(300);
  if (error || !data?.length) return 0;
  let n = 0;
  for (const m of data as M[]) {
    if (n >= limit) break;
    const { data: mem } = await db.from('manager_members').select('created_at').eq('manager_id', m.id).order('created_at').limit(1);
    const since = mem?.[0]?.created_at;
    if (!since) continue;
    const days = (Date.now() - new Date(since).getTime()) / 86400e3;
    const step = m.onboarding_step;
    if (days < DAYS[step]) continue;
    if (m.onboarding_at && Date.now() - new Date(m.onboarding_at).getTime() < 3 * 86400e3) continue; // at least 3 days apart
    const to: string[] = [];
    for (const e of await memberEmails(m.slug)) if (!(await suppressed(e))) to.push(e);
    const next = { onboarding_step: step + 1, onboarding_at: new Date().toISOString() };
    if (!to.length) { await db.from('managers').update(next).eq('id', m.id); continue; }
    if (step === 0) {
      const gaps = missing(m);
      if (gaps.length) {
        await mail(to, { subject: `Finish ${m.name}'s profile in 5 minutes`, text: `Hi,\n\nThanks for claiming ${m.name} on CoHostCompare. Owners compare profiles side by side before they ask for quotes, and complete profiles get chosen more often.\n\nStill to add:\n${gaps.map((g) => `- ${g}`).join('\n')}\n\nIt takes about five minutes.\n\nBen\nCoHostCompare`, cta: { label: 'Finish my profile', url: `${SITE}/dashboard/${m.slug}/edit` }, from: 'Ben from CoHostCompare <hello@cohostcompare.com>' });
        n++;
      }
    } else if (step === 1) {
      const pro = isPro((await plansFor([m.id])).get(m.id));
      const tpl = pro ? `\n\n4. Quote templates (in your Pro plan): save your standard fees, terms and inclusions once, then fill in any quote in one click.\n${SITE}/dashboard/${m.slug}/templates` : '';
      await mail(to, { subject: 'Get the right requests, and reply faster', text: `Hi,\n\n${pro ? 'Four' : 'Three'} quick settings that make CoHostCompare work better for ${m.name}:\n\n1. Requirements: say what you take on (for example, homes available at least 9 months a year, or full management only). Owners whose property doesn't fit can't send you a request, so you won't need to decline them.\n${SITE}/dashboard/${m.slug}/requirements\n\n2. Alerts: choose how you hear about new requests. Owners often go with whoever replies first.\n${SITE}/dashboard/${m.slug}/alerts\n\n3. Team: invite a colleague so requests never wait for one person.\n${SITE}/dashboard/${m.slug}/team${tpl}\n\nBen\nCoHostCompare`, cta: { label: 'Open my dashboard', url: `${SITE}/dashboard` }, from: 'Ben from CoHostCompare <hello@cohostcompare.com>' });
      n++;
    } else {
      await mail(to, { subject: 'How owners choose a manager on CoHostCompare', text: `Hi,\n\nNow that ${m.name} is set up, here's what we see owners care about when they compare:\n\n- Reply speed: a quick, specific reply stands out.\n- A complete quote: fees, setup costs, minimum term and what's included, in the standard format.\n- Homes nearby: owners like managers who already run homes near them. Your figures update automatically.\n- Reviews: owners you work with are invited to review you after a couple of weeks.\n\nPaid plans never change your position in results or the comparison. Pro adds insights on how your fees compare, owner demand in your postcodes, market reports, SMS alerts and quote templates, if they'd help.\n\nAny questions or ideas, just reply. I read every one.\n\nBen\nCoHostCompare`, cta: { label: 'See what Pro adds', url: `${SITE}/managers#pricing` }, from: 'Ben from CoHostCompare <hello@cohostcompare.com>' });
      n++;
    }
    await db.from('managers').update(next).eq('id', m.id);
  }
  return n;
}
