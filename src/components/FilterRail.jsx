import { CATEGORY_OPTIONS, SIZE_OPTIONS } from '../lib/shopify/filters.js';

export default function FilterRail({ category, sizes, onCategoryChange, onSizesChange, onApply, onClose }) {
  const toggleSize = (s) => {
    onSizesChange(
      sizes.includes(s) ? sizes.filter((x) => x !== s) : [...sizes, s]
    );
  };

  return (
    <aside className="w-full shrink-0 border border-hairline p-5 md:w-48 lg:w-52">
      {/* Close button — shown when rendered inside mobile sheet. */}
      {onClose && (
        <div className="mb-4 flex items-center justify-between md:hidden">
          <p className="font-display text-[9px] font-black uppercase tracking-[0.2em] text-secondary">Filters</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="grid h-8 w-8 place-items-center text-secondary hover:text-primary"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Category. */}
      <div className="mb-6">
        <p className="mb-3 font-display text-[9px] font-black uppercase tracking-[0.2em] text-secondary">
          Category
        </p>
        <ul className="flex flex-col gap-2" role="list">
          {CATEGORY_OPTIONS.map((cat) => (
            <li key={cat.value}>
              <label className="group flex cursor-pointer items-center gap-2.5">
                <span
                  className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center border transition-colors ${
                    category === cat.value
                      ? 'border-acid bg-acid'
                      : 'border-hairline group-hover:border-acid'
                  }`}
                  aria-hidden="true"
                >
                  {category === cat.value && (
                    <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M2 6l3 3 5-5" />
                    </svg>
                  )}
                </span>
                <input
                  type="radio"
                  name="category"
                  value={cat.value}
                  checked={category === cat.value}
                  onChange={() => onCategoryChange(cat.value)}
                  className="sr-only"
                />
                <span
                  className={`font-display text-[11px] font-bold uppercase tracking-wider transition-colors ${
                    category === cat.value ? 'text-primary' : 'text-secondary group-hover:text-primary'
                  }`}
                >
                  {cat.label}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </div>

      <div className="mb-6 h-px bg-hairline" />

      {/* Size. */}
      <div className="mb-6">
        <p className="mb-3 font-display text-[9px] font-black uppercase tracking-[0.2em] text-secondary">
          Size
        </p>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Size filter">
          {SIZE_OPTIONS.map((s) => {
            const active = sizes.includes(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleSize(s)}
                aria-pressed={active}
                className={`h-8 min-w-[2rem] px-2 font-display text-[10px] font-black uppercase tracking-wider transition-colors ${
                  active
                    ? 'bg-acid text-black'
                    : 'border border-hairline text-secondary hover:border-acid hover:text-primary'
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-6 h-px bg-hairline" />

      {/* Apply. */}
      <button
        type="button"
        onClick={() => { onApply(); onClose?.(); }}
        className="w-full bg-primary py-2.5 font-display text-[10px] font-black uppercase tracking-widest text-base transition-colors hover:bg-acid hover:text-black"
      >
        Apply Filters
      </button>
    </aside>
  );
}
