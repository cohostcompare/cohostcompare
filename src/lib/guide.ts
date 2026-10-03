import 'server-only';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { sign, verify } from '@/lib/claims';
import { sendEmail } from '@/lib/email';
import { RULES, RULES_CHECKED } from '@/lib/rules';
import { MANAGER_CHECKLIST, SETUP_STEPS } from '@/lib/setupSteps';
import { adminClient } from '@/lib/supabase/server';

/*
 The short-term rental setup guide: a PDF owners get for their email (SQL 025, guide_signups).
 Built on request from rules.ts and the setup checklist, so it's always as current as the site.
 Follow-up emails go only to people who ticked the consent box, and stop on unsubscribe.
*/

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cohostcompare.com';
export const GUIDE_TITLE = 'The short-term rental setup guide';
export const CONSENT_TEXT = 'Send me a few short emails to help me get set up (4 over two weeks). I can unsubscribe at any time.';
export const STATES = RULES.map((r) => ({ code: r.code, name: r.name }));

export const guideLink = (id: string) => `${SITE}/api/guide?i=${id}&s=${sign(`guide:${id}`)}`;
export const guideOk = (id: string, s: string) => verify(`guide:${id}`, s);

// ---------- PDF ----------
const TEAL = rgb(0x0f / 255, 0x5e / 255, 0x57 / 255);
const INK = rgb(0x10 / 255, 0x30 / 255, 0x2f / 255);
const MUTED = rgb(0.36, 0.42, 0.41);
const W = 595.28, H = 841.89, M = 56; // A4, margins

/** WinAnsi-safe text for the standard fonts. */
const safe = (t: string) => t.replace(/[^\x20-\x7E‘’“”–—• -ÿ]/g, '');

class Writer {
  page!: PDFPage; y = 0;
  constructor(private doc: PDFDocument, private reg: PDFFont, private bold: PDFFont) { this.newPage(); }
  newPage() { this.page = this.doc.addPage([W, H]); this.y = H - M; this.footer(); }
  footer() { this.page.drawText(safe(`${GUIDE_TITLE} · cohostcompare.com`), { x: M, y: 28, size: 8, font: this.reg, color: MUTED }); }
  need(h: number) { if (this.y - h < M) this.newPage(); }
  wrap(text: string, font: PDFFont, size: number, width: number) {
    const words = safe(text).split(/\s+/); const lines: string[] = []; let line = '';
    for (const w of words) { const t = line ? `${line} ${w}` : w; if (font.widthOfTextAtSize(t, size) > width && line) { lines.push(line); line = w; } else line = t; }
    if (line) lines.push(line);
    return lines;
  }
  text(t: string, o: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; indent?: number; gap?: number } = {}) {
    const size = o.size ?? 10.5, font = o.bold ? this.bold : this.reg, x = M + (o.indent ?? 0), lh = size * 1.4;
    for (const l of this.wrap(t, font, size, W - x - M)) { this.need(lh); this.page.drawText(l, { x, y: this.y - size, size, font, color: o.color ?? INK }); this.y -= lh; }
    this.y -= o.gap ?? 6;
  }
  bullet(t: string, indent = 0) {
    const size = 10.5; this.need(size * 1.4);
    this.page.drawText('•', { x: M + indent, y: this.y - size, size, font: this.reg, color: TEAL });
    this.text(t, { indent: indent + 12, gap: 3 });
  }
  heading(t: string) { this.need(60); this.y -= 8; this.text(t, { size: 16, bold: true, color: TEAL, gap: 8 }); }
  rule() { this.need(14); this.page.drawLine({ start: { x: M, y: this.y - 4 }, end: { x: W - M, y: this.y - 4 }, thickness: 0.6, color: rgb(0.86, 0.9, 0.89) }); this.y -= 14; }
}

export async function buildGuidePdf(stateCode: string) {
  const r = RULES.find((x) => x.code === stateCode) || RULES[0];
  const doc = await PDFDocument.create();
  doc.setTitle(`${GUIDE_TITLE}: ${r.name}`); doc.setAuthor('CoHostCompare'); doc.setCreator('CoHostCompare');
  const reg = await doc.embedFont(StandardFonts.Helvetica), bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const w = new Writer(doc, reg, bold);

  // Cover
  w.page.drawRectangle({ x: 0, y: H - 250, width: W, height: 250, color: TEAL });
  w.page.drawText('CoHostCompare', { x: M, y: H - 70, size: 14, font: bold, color: rgb(1, 1, 1) });
  const titleLines = w.wrap(GUIDE_TITLE, bold, 30, W - 2 * M);
  titleLines.forEach((l, i) => w.page.drawText(l, { x: M, y: H - 130 - i * 36, size: 30, font: bold, color: rgb(1, 1, 1) }));
  w.page.drawText(safe(`For owners in ${r.name}`), { x: M, y: H - 130 - titleLines.length * 36 - 8, size: 13, font: reg, color: rgb(1, 1, 1) });
  w.y = H - 290;
  w.text('Everything to sort out before your home takes its first guests: the rules where you are, insurance, photos, cleaning, keys and furnishing, plus the questions to ask when you compare managers.', { size: 12, gap: 10 });
  w.text(`Rules checked against official government and council sources on ${RULES_CHECKED}. General information, not legal advice.`, { size: 9.5, color: MUTED, gap: 14 });

  // 1. Rules
  w.heading(`1. The short-stay rules in ${r.name}`);
  w.text(r.summary, { bold: true, gap: 8 });
  for (const p of r.points) w.bullet(p);
  if (r.watch?.length) { w.y -= 4; w.text(`Coming up: ${r.watch.join(' ')}`, { size: 10, color: MUTED }); }
  w.y -= 4; w.text('Official sources', { bold: true, size: 10, gap: 3 });
  for (const s of r.sources) w.text(`${s.label}: ${s.url}`, { size: 8.5, color: MUTED, gap: 2 });
  w.y -= 6; w.text(`Ask a question about your suburb: ${SITE}/rules/${r.code}`, { size: 10, color: TEAL });

  // 2. Setup checklist
  w.heading('2. Your setup checklist');
  SETUP_STEPS.forEach((s, i) => {
    w.need(70);
    w.text(`${i + 1}. ${s.title}`, { bold: true, size: 12, gap: 3 });
    w.text(s.body, { gap: 3 });
    w.text(`Ask your manager: ${s.ask}`, { size: 10, color: MUTED, gap: 4 });
    w.text('[  ] Done', { size: 9.5, color: TEAL, gap: 6 });
  });

  // 3. Choosing a manager
  w.heading('3. Comparing managers: what to check');
  for (const c of MANAGER_CHECKLIST) w.bullet(c);
  w.rule();
  w.text('Compare the managers who cover your address', { bold: true, size: 13, color: TEAL, gap: 4 });
  w.text(`Fees, guest ratings and homes they run nearby, side by side. Request up to five quotes in one standard format. Free for owners, and no manager can pay to rank higher: ${SITE}`, { gap: 4 });

  return doc.save();
}

// ---------- Sign-ups and follow-up emails ----------
type Signup = { id: string; email: string; first_name: string | null; state: string; consent: boolean; step: number };
const unsub = async (email: string) => (await import('@/lib/outreach')).unsubscribeUrl(email);
const stateName = (c: string) => RULES.find((r) => r.code === c)?.name || 'your state';

export async function sendGuideEmail(s: Signup) {
  return sendEmail({
    to: s.email,
    subject: `Your short-term rental setup guide (${stateName(s.state)})`,
    text: `Hi ${s.first_name || 'there'},\n\nHere's your copy of ${GUIDE_TITLE.toLowerCase()} for ${stateName(s.state)}. It covers the rules where you are, insurance, photos, cleaning, keys and furnishing, plus what to check when you compare managers.\n\nThe link always gives you the latest version, so you can come back to it.\n\nThe CoHostCompare team${s.consent ? `\n\nDon't want our setup tips? ${await unsub(s.email)}` : ''}`,
    cta: { label: 'Download the guide (PDF)', url: guideLink(s.id) },
  });
}

const FOLLOW_UPS: { days: number; subject: (s: Signup) => string; text: (s: Signup) => string; cta: (s: Signup) => { label: string; url: string } }[] = [
  {
    days: 3,
    subject: (s) => `The rules to sort out first in ${stateName(s.state)}`,
    text: (s) => { const r = RULES.find((x) => x.code === s.state); return `Hi ${s.first_name || 'there'},\n\nThe one thing to get right before you list is the rules. In ${stateName(s.state)}:\n\n${r?.summary || ''}\n\nCouncils and strata or owners corporations can add their own rules, so it's worth asking about your suburb and building. Our rules checker answers in plain English, with the official source.`; },
    cta: (s) => ({ label: `Check the rules in ${stateName(s.state)}`, url: `${SITE}/rules/${s.state}` }),
  },
  {
    days: 7,
    subject: () => 'How to choose a manager (and what to ask)',
    text: (s) => `Hi ${s.first_name || 'there'},\n\nMost owners hand the day-to-day to a manager or co-host. The ones worth talking to already run homes near you and have strong guest ratings for them.\n\nWhen you compare, check:\n${MANAGER_CHECKLIST.slice(0, 5).map((c) => `- ${c}`).join('\n')}\n\nOn CoHostCompare you can see this side by side for the managers who cover your address, and request quotes from up to five in one standard format. It's free, and no manager can pay to rank higher.`,
    cta: () => ({ label: 'Compare managers near you', url: `${SITE}/` }),
  },
  {
    days: 12,
    subject: () => 'What could your place earn?',
    text: (s) => `Hi ${s.first_name || 'there'},\n\nLast one from us. If you haven't yet, get a free estimate of what your property could earn as a short stay. Enter your address and bedrooms, and we'll work it out from area averages over the last 12 months.\n\nWhen you're ready, compare the managers who cover your address and get quotes in one go.\n\nGood luck with the setup.\n\nThe CoHostCompare team`,
    cta: () => ({ label: 'Estimate my earnings', url: `${SITE}/earnings` }),
  },
];

/** Daily: next follow-up for people who opted in (never if unsubscribed). */
export async function runGuideEmails(limit = 40) {
  const db = adminClient();
  const { data, error } = await db.from('guide_signups').select('id, email, first_name, state, consent, step').eq('consent', true).lt('step', FOLLOW_UPS.length).lte('next_at', new Date().toISOString()).limit(limit);
  if (error || !data?.length) return 0;
  const { suppressed } = await import('@/lib/outreach');
  let n = 0;
  for (const s of data as Signup[]) {
    if (await suppressed(s.email)) { await db.from('guide_signups').update({ consent: false, next_at: null }).eq('id', s.id); continue; }
    const f = FOLLOW_UPS[s.step];
    const url = await unsub(s.email);
    const ok = await sendEmail({ to: s.email, subject: f.subject(s), text: `${f.text(s)}\n\nDon't want these emails? ${url}`, cta: f.cta(s), headers: { 'List-Unsubscribe': `<${(await import('@/lib/outreach')).unsubscribeUrl(s.email, true)}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } });
    if (!ok) continue;
    const next = FOLLOW_UPS[s.step + 1];
    await db.from('guide_signups').update({ step: s.step + 1, next_at: next ? new Date(Date.now() + (next.days - f.days) * 86400e3).toISOString() : null }).eq('id', s.id);
    n++;
  }
  return n;
}

export const FIRST_FOLLOW_UP_DAYS = FOLLOW_UPS[0].days;
