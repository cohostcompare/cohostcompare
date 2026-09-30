import { NextResponse, type NextRequest } from 'next/server';
import { RULES, RULES_CHECKED, rulesAsText } from '@/lib/rules';

// Answers owners' questions using only our state-by-state guide. Needs ANTHROPIC_API_KEY in Vercel.
const MODEL = 'claude-haiku-4-5-20251001';
const hits = new Map<string, number[]>(); // simple per-instance rate limit

export async function POST(req: NextRequest) {
  const key = (process.env.ANTHROPIC_API_KEY || '').trim();
  if (!key) return NextResponse.json({ error: 'Ask about the rules is coming soon. For now, see the state-by-state guide below.' });

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 60 * 60 * 1000);
  if (recent.length >= 15) return NextResponse.json({ error: "You've asked a lot of questions in the last hour. Try again later." });
  hits.set(ip, [...recent, now]);

  let question = '';
  try { question = String((await req.json()).question || '').trim().slice(0, 400); } catch { /* empty */ }
  if (question.length < 8) return NextResponse.json({ error: 'Ask a full question.' });

  const system = `You answer questions from Australian property owners about short-term rental (Airbnb-style) rules on CoHostCompare.
Use ONLY the guide below (last checked ${RULES_CHECKED}). If the guide doesn't cover the question, say so plainly and suggest checking with the local council, strata or owners corporation.
Answer in plain Australian English, 2 to 5 short sentences, no headings or markdown. Mention the state you're answering for. Never invent figures, dates or rules. Anything marked "Caveat" is announced or proposed but NOT yet law, so say that clearly. This is general information, not legal advice.
If the question isn't about short-term rental rules, briefly say you can only help with those.
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
