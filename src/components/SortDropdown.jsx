import { SORT_OPTIONS } from '../lib/shopify/filters.js';
import { trackEvent, EVENTS } from '../lib/analytics/ga4.js';

export default function SortDropdown({ value, onChange }) {
  const current = SORT_OPTIONS.find((o) => o.value === value) ?? SORT_OPTIONS[0];

  const handleChange = (e) => {
    onChange(e.target.value);
    trackEvent(EVENTS.SORT_CHANGE, { sort_value: e.target.value });
  };

  return (
    <div className="flex items-center gap-3">
      <span className="font-display text-[10px] font-bold uppercase tracking-widest text-secondary">
        Sort By
      </span>
      <div className="relative">
        <select
          value={current.value}
          onChange={handleChange}
          className="appearance-none border border-hairline bg-surface py-2 pl-4 pr-10 font-display text-[11px] font-bold uppercase tracking-widest text-primary transition-colors hover:border-acid focus:border-acid focus:outline-none"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {/* Chevron */}
        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-secondary">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
      </div>
    </div>
  );
}
