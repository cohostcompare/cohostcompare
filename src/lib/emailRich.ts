import { tagLink } from '@/lib/email';

/*
 The designed email layout (Nov 2026): paper background, wordmark, a white card with a small teal label, a headline,
 short paragraphs, an optional row of big figures, optional quick-answer chips, one main button, then a quiet legal footer.
 Tables and inline styles only, so it holds up in Gmail, Outlook and Apple Mail. Light colours on every device.
*/
const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const F = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const INK = '#10302F', TEAL = '#0F5E57', MUTED = '#4A605D', LINE = '#E4E0D6', PAPER = '#F8F6F1', TINT = '#DCEBE6';

export type Rich = {
  preheader?: string; label?: string; heading: string; paras: string[];
  stats?: { value: string; label: string }[];
  chips?: { title: string; items: { label: string; url: string }[] };
  cta?: { label: string; url: string };
  after?: string[]; // paragraphs under the button
  footer: string[]; // small print lines (plain text; links are made clickable)
};

const linkify = (t: string) => esc(t).replace(/(https:\/\/[^\s<]+)/g, (u) => `<a href="${tagLink(u.replace(/&amp;/g, '&')).replace(/&/g, '&amp;')}" style="color:${TEAL};">${u.replace(/^https:\/\/(www\.)?/, '').replace(/[?#].*$/, '')}</a>`);
const p = (t: string, size = 16, color = INK, mt = 16) => `<p style="margin:${mt}px 0 0;font-family:${F};font-size:${size}px;line-height:${Math.round(size * 1.55)}px;color:${color};">${linkify(t)}</p>`;

export function richHtml(r: Rich) {
  const stats = r.stats?.length ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 0;background:${PAPER};border-radius:12px;"><tr>${r.stats.map((s, i) => `<td width="${Math.floor(100 / r.stats!.length)}%" valign="top" style="padding:16px 14px;${i ? `border-left:1px solid ${LINE};` : ''}"><div style="font-family:${F};font-size:11px;line-height:15px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${MUTED};">${esc(s.label)}</div><div style="font-family:${F};font-size:28px;line-height:34px;font-weight:800;color:${INK};padding-top:2px;">${esc(s.value)}</div></td>`).join('')}</tr></table>` : '';
  const chips = r.chips ? `<div style="margin:24px 0 0;font-family:${F};font-size:13px;line-height:18px;font-weight:700;color:${MUTED};">${esc(r.chips.title)}</div><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 0;"><tr>${r.chips.items.map((c) => `<td style="padding:0 8px 8px 0;"><a href="${esc(tagLink(c.url))}" style="display:inline-block;padding:11px 16px;border:1.5px solid ${TEAL};border-radius:999px;font-family:${F};font-size:16px;line-height:18px;font-weight:700;color:${TEAL};text-decoration:none;background:#FFFFFF;">${esc(c.label)}</a></td>`).join('')}</tr></table>` : '';
  const button = r.cta ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0 0;"><tr><td bgcolor="${TEAL}" style="border-radius:10px;"><a href="${esc(tagLink(r.cta.url))}" style="display:inline-block;padding:15px 26px;font-family:${F};font-size:16px;line-height:18px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:10px;">${esc(r.cta.label)}&nbsp;&rarr;</a></td></tr></table>` : '';
  return `<!doctype html><html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only"></head><body style="margin:0;padding:0;background:${PAPER};">${r.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${PAPER};">${esc(r.preheader)}</div>` : ''}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PAPER};"><tr><td align="center" style="padding:32px 14px 40px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;"><tr><td style="padding:0 6px 18px;"><a href="https://www.cohostcompare.com" style="text-decoration:none;"><img src="https://www.cohostcompare.com/email/logo-mark.png" width="30" height="30" alt="" style="border:0;width:30px;height:30px;vertical-align:middle;"><span style="font-family:${F};font-size:18px;font-weight:800;color:${INK};vertical-align:middle;padding-left:8px;">CoHostCompare</span></a></td></tr><tr><td style="background:#FFFFFF;border:1px solid ${LINE};border-radius:16px;padding:32px 30px 34px;">${r.label ? `<div style="display:inline-block;padding:4px 10px;border-radius:999px;background:${TINT};font-family:${F};font-size:11px;line-height:15px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:${TEAL};">${esc(r.label)}</div>` : ''}<h1 style="margin:${r.label ? 14 : 0}px 0 0;font-family:${F};font-size:26px;line-height:32px;font-weight:800;letter-spacing:-.01em;color:${INK};">${esc(r.heading)}</h1>${r.paras.map((t, i) => p(t, 16, INK, i ? 14 : 16)).join('')}${stats}${chips}${button}${(r.after || []).map((t) => p(t, 14, MUTED, 18)).join('')}</td></tr><tr><td style="padding:22px 8px 0;">${r.footer.map((t, i) => p(t, 12, MUTED, i ? 8 : 0)).join('')}</td></tr></table></td></tr></table></body></html>`;
}

/** The same email as plain text, for clients that don't show HTML. */
export function richText(r: Rich) {
  return [r.heading, ...r.paras, r.stats?.length ? r.stats.map((s) => `${s.label}: ${s.value}`).join(' · ') : '', r.chips ? `${r.chips.title}\n${r.chips.items.map((c) => `${c.label}: ${c.url}`).join('\n')}` : '', r.cta ? `${r.cta.label}: ${r.cta.url}` : '', ...(r.after || []), ...r.footer].filter(Boolean).join('\n\n');
}
