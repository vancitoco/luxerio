import { trackEvent, EVENTS } from '../lib/analytics/ga4.js';

/*
  Renders size pills for a single `Size` option axis.
  `quantityAvailable` < 3 → LOW STOCK label.
  `availableForSale: false` → greyed-out + unselectable.
*/
export default function VariantSelector({ variants = [], selected, onSelect }) {
  // Group by Size option value — keep original variant as `_variant` for onSelect.
  const sizeVariants = variants
    .filter((v) => v.selectedOptions?.some((o) => o.name === 'Size'))
    .map((v) => ({
      id: v.id,
      size: v.selectedOptions.find((o) => o.name === 'Size')?.value,
      available: v.availableForSale,
      low: v.quantityAvailable != null && v.quantityAvailable > 0 && v.quantityAvailable < 3,
      price: v.price,
      _variant: v,
    }));

  // Fallback: if no Size option, show variants by title.
  const items = sizeVariants.length
    ? sizeVariants
    : variants.map((v) => ({
        id: v.id,
        size: v.title,
        available: v.availableForSale,
        low: false,
        price: v.price,
        _variant: v,
      }));

  const handleSelect = (item) => {
    if (!item.available) return;
    onSelect(item._variant);
    trackEvent(EVENTS.SELECT_VARIANT, { variant_id: item.id, size: item.size });
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="font-display text-[10px] font-black uppercase tracking-widest text-secondary">
          Select Size
        </span>
        <button
          type="button"
          className="font-display text-[10px] font-bold uppercase tracking-widest text-acid hover:underline"
        >
          Size Guide
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          const isSelected = selected?.id === item.id;
          return (
            <button
              key={item.id}
              type="button"
              disabled={!item.available}
              onClick={() => handleSelect(item)}
              className={`relative min-w-[3rem] border px-4 py-2.5 font-display text-xs font-black uppercase tracking-wider transition-colors
                ${isSelected
                  ? 'border-acid bg-acid text-black'
                  : item.available
                  ? 'border-hairline text-primary hover:border-primary'
                  : 'cursor-not-allowed border-hairline text-secondary opacity-40 line-through'
                }`}
            >
              {item.size}
              {item.low && item.available && !isSelected && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-surface px-1 font-display text-[8px] font-black uppercase tracking-widest text-acid">
                  Low
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
