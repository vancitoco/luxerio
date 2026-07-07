import { X } from '@phosphor-icons/react';
import {
  CATEGORY_OPTIONS,
  CLOTHING_SIZE_OPTIONS,
  WAIST_SIZE_OPTIONS,
  MENS_SHOE_OPTIONS,
  WOMENS_SHOE_OPTIONS,
} from '../lib/shopify/filters.js';

export default function FilterRail({ categories, sizes, onCategoriesChange, onSizesChange, onApply, onClose }) {
  const toggleCategory = (val) => {
    onCategoriesChange(
      categories.includes(val) ? categories.filter((x) => x !== val) : [...categories, val]
    );
  };

  const toggleSize = (s) => {
    onSizesChange(
      sizes.includes(s) ? sizes.filter((x) => x !== s) : [...sizes, s]
    );
  };

  const selectableCategories = CATEGORY_OPTIONS.filter((c) => c.value !== '');

  return (
    <aside className="w-full shrink-0 border border-hairline p-5 md:w-52 lg:w-56">
      {/* Close button — mobile sheet only */}
      {onClose && (
        <div className="mb-4 flex items-center justify-between md:hidden">
          <p className="font-display text-[9px] font-black uppercase tracking-[0.2em] text-secondary">Filters</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="grid h-8 w-8 place-items-center text-secondary hover:text-primary"
          >
            <X size={14} weight="regular" />
          </button>
        </div>
      )}

      {/* Category — multi-select */}
      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-display text-[9px] font-black uppercase tracking-[0.2em] text-secondary">Category</p>
          {categories.length > 0 && (
            <button
              type="button"
              onClick={() => onCategoriesChange([])}
              className="font-display text-[9px] uppercase tracking-widest text-acid hover:opacity-70"
            >
              Clear
            </button>
          )}
        </div>
        <ul className="flex max-h-64 flex-col gap-2 overflow-y-auto pr-1" role="list">
          {selectableCategories.map((cat) => {
            const active = categories.includes(cat.value);
            return (
              <li key={cat.value}>
                <label className="group flex cursor-pointer items-center gap-2.5">
                  <span
                    className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center border transition-colors ${
                      active ? 'border-acid bg-acid' : 'border-hairline group-hover:border-acid'
                    }`}
                    aria-hidden="true"
                  >
                    {active && (
                      <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M2 6l3 3 5-5" />
                      </svg>
                    )}
                  </span>
                  <input
                    type="checkbox"
                    value={cat.value}
                    checked={active}
                    onChange={() => toggleCategory(cat.value)}
                    className="sr-only"
                  />
                  <span
                    className={`font-display text-[11px] font-bold uppercase tracking-wider transition-colors ${
                      active ? 'text-primary' : 'text-secondary group-hover:text-primary'
                    }`}
                  >
                    {cat.label}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mb-6 h-px bg-hairline" />

      {/* Clothing Size — T-Shirts & Shirts */}
      <SizeGroup
        label="Clothing Size"
        ariaLabel="Clothing size filter"
        options={CLOTHING_SIZE_OPTIONS}
        sizes={sizes}
        onToggle={toggleSize}
      />

      <div className="mb-6 h-px bg-hairline" />

      {/* Waist Size — Jeans & Trousers */}
      <SizeGroup
        label="Waist Size"
        ariaLabel="Waist size filter"
        options={WAIST_SIZE_OPTIONS}
        sizes={sizes}
        onToggle={toggleSize}
      />

      <div className="mb-6 h-px bg-hairline" />

      {/* Men's Shoe Size */}
      <SizeGroup
        label="Men's Shoes"
        ariaLabel="Men's shoe size filter"
        options={MENS_SHOE_OPTIONS}
        sizes={sizes}
        onToggle={toggleSize}
      />

      <div className="mb-6 h-px bg-hairline" />

      {/* Women's Shoe Size */}
      <SizeGroup
        label="Women's Shoes"
        ariaLabel="Women's shoe size filter"
        options={WOMENS_SHOE_OPTIONS}
        sizes={sizes}
        onToggle={toggleSize}
      />

      <div className="mb-6 h-px bg-hairline" />

      {/* Apply */}
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

/*
  Renders one size section. `options` may be plain strings (value === label)
  or { label, value } objects (shoe sizes, where value is the exact variant string).
*/
function SizeGroup({ label, ariaLabel, options, sizes, onToggle }) {
  const items = options.map((o) =>
    typeof o === 'string' ? { label: o, value: o } : o
  );
  return (
    <div className="mb-6">
      <p className="mb-3 font-display text-[9px] font-black uppercase tracking-[0.2em] text-secondary">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={ariaLabel}>
        {items.map((item) => {
          const active = sizes.includes(item.value);
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => onToggle(item.value)}
              aria-pressed={active}
              className={`h-8 min-w-[2rem] px-2.5 font-display text-[10px] font-black uppercase tracking-wider transition-colors ${
                active
                  ? 'bg-acid text-black'
                  : 'border border-hairline text-secondary hover:border-acid hover:text-primary'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
