import { X } from '@phosphor-icons/react';
import {
  CATEGORY_OPTIONS,
  CLOTHING_SIZE_OPTIONS,
  WAIST_SIZE_OPTIONS,
  MENS_SHOE_OPTIONS,
  WOMENS_SHOE_OPTIONS,
} from '../lib/shopify/filters.js';

// Which size groups apply to which categories. Categories not listed here
// (watches, sunglasses) have no size axis — no group shows for them.
const CATEGORY_SIZE_GROUPS = {
  't-shirts': ['clothing'],
  'shirts': ['clothing'],
  'jeans': ['waist'],
  'trousers': ['waist'],
  'mens-shoes': ['mens-shoe'],
  'womens-shoes': ['womens-shoe'],
};

const SIZE_GROUP_VALUES = {
  clothing: CLOTHING_SIZE_OPTIONS,
  waist: WAIST_SIZE_OPTIONS,
  'mens-shoe': MENS_SHOE_OPTIONS.map((o) => o.value),
  'womens-shoe': WOMENS_SHOE_OPTIONS.map((o) => o.value),
};

// No category picked → every group is fair game (unfiltered browse).
// Otherwise → union of groups applicable to the selected categories.
function applicableGroups(categories) {
  if (!categories.length) return new Set(Object.keys(SIZE_GROUP_VALUES));
  const groups = new Set();
  categories.forEach((cat) => (CATEGORY_SIZE_GROUPS[cat] || []).forEach((g) => groups.add(g)));
  return groups;
}

export default function FilterRail({ categories, sizes, onCategoriesChange, onSizesChange, onApply, onClose }) {
  const activeGroups = applicableGroups(categories);

  const toggleCategory = (val) => {
    const nextCategories = categories.includes(val)
      ? categories.filter((x) => x !== val)
      : [...categories, val];

    // Drop any selected sizes that fall outside the newly-applicable groups —
    // otherwise a stale hidden selection silently zeroes out results again.
    const nextGroups = applicableGroups(nextCategories);
    const allowedValues = new Set(
      [...nextGroups].flatMap((g) => SIZE_GROUP_VALUES[g])
    );
    const nextSizes = sizes.filter((s) => allowedValues.has(s));

    onCategoriesChange(nextCategories);
    if (nextSizes.length !== sizes.length) onSizesChange(nextSizes);
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
          <p className="font-display text-[9px] font-semibold uppercase tracking-[0.2em] text-secondary">Filters</p>
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
          <p className="font-display text-[9px] font-semibold uppercase tracking-[0.2em] text-secondary">Category</p>
          {(categories.length > 0 || sizes.length > 0) && (
            <button
              type="button"
              onClick={() => { onCategoriesChange([]); onSizesChange([]); }}
              className="font-display text-[9px] uppercase tracking-widest text-acid hover:opacity-70"
            >
              Clear All
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
                      <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="var(--bg-base)" strokeWidth="2.5" strokeLinecap="round">
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

      {/* Clothing Size — T-Shirts & Shirts */}
      {activeGroups.has('clothing') && (
        <>
          <div className="mb-6 h-px bg-hairline" />
          <SizeGroup
            label="Clothing Size"
            ariaLabel="Clothing size filter"
            options={CLOTHING_SIZE_OPTIONS}
            sizes={sizes}
            onToggle={toggleSize}
          />
        </>
      )}

      {/* Waist Size — Jeans & Trousers */}
      {activeGroups.has('waist') && (
        <>
          <div className="mb-6 h-px bg-hairline" />
          <SizeGroup
            label="Waist Size"
            ariaLabel="Waist size filter"
            options={WAIST_SIZE_OPTIONS}
            sizes={sizes}
            onToggle={toggleSize}
          />
        </>
      )}

      {/* Men's Shoe Size */}
      {activeGroups.has('mens-shoe') && (
        <>
          <div className="mb-6 h-px bg-hairline" />
          <SizeGroup
            label="Men's Shoes"
            ariaLabel="Men's shoe size filter"
            options={MENS_SHOE_OPTIONS}
            sizes={sizes}
            onToggle={toggleSize}
          />
        </>
      )}

      {/* Women's Shoe Size */}
      {activeGroups.has('womens-shoe') && (
        <>
          <div className="mb-6 h-px bg-hairline" />
          <SizeGroup
            label="Women's Shoes"
            ariaLabel="Women's shoe size filter"
            options={WOMENS_SHOE_OPTIONS}
            sizes={sizes}
            onToggle={toggleSize}
          />
        </>
      )}

      <div className="mb-6 h-px bg-hairline" />

      {/* Apply */}
      <button
        type="button"
        onClick={() => { onApply(); onClose?.(); }}
        className="w-full bg-primary py-2.5 font-display text-[10px] font-semibold uppercase tracking-widest text-base transition-colors hover:opacity-80"
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
      <p className="mb-3 font-display text-[9px] font-semibold uppercase tracking-[0.2em] text-secondary">
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
              className={`h-8 min-w-[2rem] px-2.5 font-display text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                active
                  ? 'bg-primary text-base'
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
