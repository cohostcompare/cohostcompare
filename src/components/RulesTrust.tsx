import { RULES_CHECKED } from '@/lib/rules';

/** Shown wherever rules content appears: where it comes from and how fresh it is. */
export default function RulesTrust({ style }: { style?: React.CSSProperties }) {
  return (
    <p className="rules-trust" style={style}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6l-8-3Z" /><path d="m9 12 2 2 4-4" /></svg>
      <span>From official government and council sources · last checked {RULES_CHECKED} · reviewed twice a month</span>
    </p>
  );
}
