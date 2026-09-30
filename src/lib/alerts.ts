import 'server-only';
import { createHash } from 'crypto';
import { sendEmail } from '@/lib/email';
import { adminClient } from '@/lib/supabase/server';

const QUIET_HOURS = 6;
const recent = new Map<string, number>(); // per server instance, in case the database is the thing that's down

/** Records a server error and emails hello@ unless the same error was alerted in the last few hours. Needs SQL 012. */
export async function alertError(err: unknown, where: { path: string; method: string; route?: string; kind?: string }) {
  const e = err as { message?: string; stack?: string; digest?: string };
  const message = String(e?.message || err).slice(0, 500);
  // Group by route and the first line of the message, ignoring ids and numbers.
  const sig = createHash('sha1').update(`${where.route || where.path}|${message.split('\n')[0].replace(/[0-9a-f-]{8,}|\d+/gi, '#')}`).digest('hex').slice(0, 16);
  const now = Date.now();
  if ((recent.get(sig) || 0) > now - QUIET_HOURS * 3600e3) return;
  recent.set(sig, now);

  let count = 1;
  let alert = true;
  const db = adminClient();
  const { data: row } = await db.from('error_events').select('count, last_alerted_at').eq('sig', sig).maybeSingle();
  if (row) {
    count = row.count + 1;
    alert = !row.last_alerted_at || new Date(row.last_alerted_at).getTime() < now - QUIET_HOURS * 3600e3;
  }
  await db.from('error_events').upsert({ sig, route: where.route || where.path, message, count, last_seen_at: new Date().toISOString(), ...(alert ? { last_alerted_at: new Date().toISOString() } : {}) });
  if (!alert) return;

  await sendEmail({
    to: 'hello@cohostcompare.com',
    subject: `Site error: ${where.route || where.path}`,
    text: `Something went wrong on the live site.\n\nPage: ${where.method} ${where.path}\nRoute: ${where.route || '-'} (${where.kind || '-'})\nError: ${message}${e?.digest ? `\nDigest: ${e.digest}` : ''}\nSeen ${count} time${count === 1 ? '' : 's'} so far.\n\n${(e?.stack || '').split('\n').slice(0, 8).join('\n')}\n\nYou won't get another email about this error for ${QUIET_HOURS} hours. Full logs are in Vercel under Logs.`,
  });
}
