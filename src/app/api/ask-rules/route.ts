import { NextResponse, type NextRequest } from 'next/server';
import { allow, callerKey, underDailyTotal } from '@/lib/rate';
import { RULES, RULES_CHECKED, RULES_STALE_DAYS, rulesAgeDays, rulesAsText } from '@/lib/rules';

// Answers owners' questions using only our state-by-state guide. Needs ANTHROPIC_API_KEY in Vercel.
const MODEL = 'claude-haiku-4-5-20251001';
const PER_HOUR = 15;        // questions per network address an hour
const PER_DAY_TOTAL = 600;  // across everyone: caps the Anthropic bill if something goes wrong

export async function POST(req: NextRequest) {
  const key = (process.env.ANTHROPIC_API_KEY || '').trim();
  if (!key) return NextResponse.json({ error: 'Ask about the rules is coming soon. For now, see the state-by-state guide below.' });

  const site = req.headers.get('sec-fetch-site');
  if (site && site !== 'same-origin') return NextResponse.json({ error: 'Ask from the rules page on CoHostCompare.' }, { status: 403 });
  if (!(await underDailyTotal('ask', PER_DAY_TOTAL))) return NextResponse.json({ error: "The rules helper is busy today. The state-by-state guide below has the same information." });
  if (!(await allow('ask', await callerKey(req.headers), PER_HOUR, 3600e3))) return NextResponse.json({ error: "You've asked a lot of questions in the last hour. Try again later." });

  let question = '';
  try { question = String((await req.json()).question || '').trim().slice(0, 400); } catch { /* empty */ }
  if (question.length < 8) return NextResponse.json({ error: 'Ask a full question.' });

  const system = `You answer questions from Australian property owners about short-term rental (Airbnb-style) rules on CoHostCompare.
Use ONLY the guide below (last checked ${RULES_CHECKED}). If the guide doesn't cover the question, say so plainly and suggest checking with the local council, strata or owners corporation.
Answer in plain Australian English, 2 to 5 short sentences, no headings or markdown. Mention the state you're answering for. Never invent figures, dates or rules. Anything marked "Caveat" is announced or proposed but NOT yet law, so say that clearly. This is general information, not legal advice.
${rulesAgeDays() > RULES_STALE_DAYS ? `The guide is ${rulesAgeDays()} days old and overdue for review, so end your answer by telling the owner to confirm with the official source linked below. ` : ''}If the question isn't about short-term rental rules, briefly say you can only help with those.
At the very end, on its own line, write STATES: followed by the state codes you used, comma-separated (e.g. STATES: nsw), or STATES: none.

GUIDE
${rulesAsText()}`;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: MODEL, max_tokens: 400, system, messages: [{ role: 'user', content: question }] }),
    });
    const data = await r.json();
    if (!r.ok) { console.error('anthropic', r.status, data); return NextResponse.json({ error: "We couldn't get an answer just now. Try again in a minute." }); }
    const text: string = (data.content || []).map((c: { text?: string }) => c.text || '').join('').trim();
    const m = text.match(/STATES:\s*([a-z,\s]+)\s*$/i);
    const codes = m ? m[1].split(',').map((s) => s.trim().toLowerCase()).filter(Boolean) : [];
    const answer = text.replace(/\n?STATES:.*$/i, '').trim();
    const sources = RULES.filter((s) => codes.includes(s.code)).flatMap((s) => s.sources);
    return NextResponse.json({ answer, sources });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "We couldn't get an answer just now. Try again in a minute." });
  }
}
