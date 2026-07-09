import QtyStepper from './QtyStepper.jsx';
import { useCart } from '../context/CartContext.jsx';

function fmt(amount, currencyCode = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(amount);
}

export default function CartLine({ line }) {
  const { updateQty, removeLine, loading } = useCart();
  const { lineId, merchandiseId, title, variant, price, currencyCode, image, qty } = line;

  // Derive collection tag from variant title for the FW-drop badge.
  const badge = variant && variant !== 'Default Title' ? variant : null;

  const thumb = (
    <div className="h-20 w-16 shrink-0 overflow-hidden bg-elevated md:h-24 md:w-20">
      {image ? (
        <img src={image} alt={title} className="h-full w-full object-cover" />
      ) : (
        <div className="h-full w-full bg-gradient-to-br from-elevated to-[#0a0a0a]" />
      )}
    </div>
  );

  const details = (
    <div className="min-w-0 flex flex-col gap-1">
      {badge && (
        <span className="inline-block w-fit bg-primary px-2 py-0.5 font-display text-[8px] font-semibold uppercase tracking-widest text-base">
          {badge}
        </span>
      )}
      <p className="font-display text-sm font-semibold uppercase leading-tight tracking-[0.08em] text-primary">
        {title}
      </p>
      <p className="font-display text-[10px] uppercase tracking-wider text-secondary">
        {variant && variant !== 'Default Title' ? `Size: ${variant}` : ''}
      </p>
    </div>
  );

  const stepper = (
    <QtyStepper
      qty={qty}
      disabled={loading}
      onDecrement={() => updateQty(lineId, qty - 1)}
      onIncrement={() => updateQty(lineId, qty + 1)}
    />
  );

  const priceTag = (
    <p className="min-w-[4rem] text-right font-display text-sm font-semibold text-primary tabular-nums">
      {fmt(price * qty, currencyCode)}
    </p>
  );

  const removeBtn = (
    <button
      type="button"
      onClick={() => removeLine(lineId, merchandiseId)}
      disabled={loading}
      aria-label="Remove item"
      className="text-secondary transition-colors hover:text-primary disabled:opacity-40"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M18 6 6 18M6 6l12 12" />
      </svg>
    </button>
  );

  return (
    <div className="border-b border-hairline py-5">
      {/* Mobile — stacked: thumb+details on top, qty/price/remove below.
          A single fixed-column grid can't fit thumbnail + qty stepper +
          price + remove on a phone-width row without crushing the title. */}
      <div className="flex gap-4 md:hidden">
        {thumb}
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {details}
          <div className="flex items-center justify-between gap-3">
            {stepper}
            <div className="flex items-center gap-4">
              {priceTag}
              {removeBtn}
            </div>
          </div>
        </div>
      </div>

      {/* Desktop — single row grid. */}
      <div className="hidden grid-cols-[auto_1fr_auto_auto_auto] items-center gap-6 md:grid">
        {thumb}
        {details}
        {stepper}
        {priceTag}
        {removeBtn}
      </div>
    </div>
  );
}
