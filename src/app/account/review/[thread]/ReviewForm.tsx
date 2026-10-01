'use client';
import { useActionState, useState } from 'react';
import { saveReview } from './actions';

const WORDS = ['', 'Poor', 'Below average', 'OK', 'Good', 'Excellent'];

export default function ReviewForm({ thread, name, rating: r0, body: b0 }: { thread: string; name: string; rating?: number; body?: string }) {
  const [state, action, pending] = useActionState(saveReview, {});
  const [rating, setRating] = useState(r0 || 0);
  const [hover, setHover] = useState(0);
  const shown = hover || rating;
  return (
    <form action={action} className="panel" style={{ display: 'grid', gap: 14 }}>
      <input type="hidden" name="thread" value={thread} />
      <input type="hidden" name="rating" value={rating || ''} />
      <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 6 }}>
        <legend className="label" style={{ marginBottom: 6 }}>Overall, how would you rate {name}?</legend>
        <div className="star-pick" onMouseLeave={() => setHover(0)} role="radiogroup" aria-label="Star rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n === 1 ? '' : 's'}: ${WORDS[n]}`}
              className={n <= shown ? 'on' : ''} onMouseEnter={() => setHover(n)} onFocus={() => setHover(n)} onBlur={() => setHover(0)} onClick={() => setRating(n)}>★</button>
          ))}
          <span className="hint" style={{ marginLeft: 8 }}>{WORDS[shown]}</span>
        </div>
      </fieldset>
      <label style={{ display: 'grid', gap: 6 }}>
        <span className="label">Your review</span>
        <textarea name="body" rows={6} defaultValue={b0} required minLength={30} maxLength={3000}
          placeholder={`How has it been working with ${name}? Think about communication, how your place is looked after, guest reviews and bookings, and whether the fees matched the quote.`} />
      </label>
      {state.error && <p role="alert" style={{ margin: 0, color: 'var(--signal)' }}>{state.error}</p>}
      <button className="btn primary" type="submit" disabled={pending || !rating} style={{ justifySelf: 'start' }}>{pending ? 'Saving…' : b0 ? 'Update review' : 'Post review'}</button>
    </form>
  );
}
