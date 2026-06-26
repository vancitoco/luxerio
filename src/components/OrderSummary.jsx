import { useState } from 'react';
import { useCart } from '../context/CartContext.jsx';

function fmt(amount, currencyCode = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(amount);
}

export default function OrderSummary() {
  const { cost, subtotal, discountCodes, applyDiscount, initiateCheckout, lines, loading } = useCart();
  const [code, setCode]       = useState('');
  const [promoMsg, setPromoMsg] = useState(null);
  const [applying, setApplying] = useState(false);

  const currencyCode = cost?.currencyCode ?? 'USD';
  const displaySubtotal = cost?.subtotal ?? subtotal;
  const displayTotal    = cost?.total    ?? subtotal;
  const isEmpty = lines.length === 0;

  const handlePromo = async () => {
    if (!code.trim()) return;
    setApplying(true);
    setPromoMsg(null);
    const result = await applyDiscount(code.trim().toUpperCase());
    setPromoMsg(result.ok ? { type: 'ok', text: 'Code applied.' } : { type: 'err', text: result.error });
    setApplying(false);
  };

  const activeDiscount = discountCodes.find((d) => d.applicable);

  return (
    <aside className="sticky top-20 flex flex-col gap-0 border border-hairline bg-surface lg:min-w-[320px]">
      {/* Header. */}
      <div className="border-b border-hairline px-6 py-5">
        <h2 className="font-display text-sm font-black uppercase tracking-widest text-primary">
          Order Summary
        </h2>
      </div>

      <div className="flex flex-col gap-4 px-6 py-5">
        {/* Subtotal. */}
        <div className="flex items-center justify-between">
          <span className="font-display text-[10px] font-bold uppercase tracking-widest text-secondary">
            Subtotal
          </span>
          <span className="font-display text-sm font-black tabular-nums text-primary">
            {fmt(displaySubtotal, currencyCode)}
          </span>
        </div>

        {/* Shipping. */}
        <div className="flex items-center justify-between">
          <span className="font-display text-[10px] font-bold uppercase tracking-widest text-secondary">
            Est. Shipping
          </span>
          <span className="font-display text-[10px] font-bold uppercase tracking-widest text-secondary">
            Calculated at checkout
          </span>
        </div>

        {/* Applied discount badge. */}
        {activeDiscount && (
          <div className="flex items-center justify-between">
            <span className="font-display text-[10px] font-bold uppercase tracking-widest text-acid">
              {activeDiscount.code}
            </span>
            <span className="font-display text-[10px] font-bold uppercase text-acid">Applied</span>
          </div>
        )}

        {/* Divider. */}
        <div className="h-px bg-hairline" />

        {/* Promo input. */}
        <div>
          <p className="mb-2 font-display text-[9px] font-black uppercase tracking-widest text-secondary">
            Access Code / Promo
          </p>
          <div className="flex gap-0">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePromo()}
              placeholder="Enter code"
              className="flex-1 border border-hairline bg-base px-4 py-2.5 font-display text-[11px] uppercase tracking-widest text-primary placeholder:text-secondary focus:border-acid focus:outline-none"
            />
            <button
              type="button"
              onClick={handlePromo}
              disabled={applying || isEmpty}
              className="border border-l-0 border-hairline bg-elevated px-4 font-display text-[10px] font-black uppercase tracking-widest text-primary transition-colors hover:border-acid hover:text-acid disabled:opacity-40"
            >
              {applying ? '…' : 'Apply'}
            </button>
          </div>
          {promoMsg && (
            <p className={`mt-1.5 font-display text-[10px] uppercase tracking-wider ${promoMsg.type === 'ok' ? 'text-acid' : 'text-red-400'}`}>
              {promoMsg.text}
            </p>
          )}
        </div>

        {/* Divider. */}
        <div className="h-px bg-hairline" />

        {/* Total. */}
        <div className="flex items-baseline justify-between">
          <span className="font-display text-[10px] font-black uppercase tracking-widest text-secondary">
            Total
          </span>
          <span className="font-display text-3xl font-black tabular-nums text-primary">
            {fmt(displayTotal, currencyCode)}
          </span>
        </div>

        {/* Checkout CTA. */}
        <button
          type="button"
          onClick={initiateCheckout}
          disabled={isEmpty || loading}
          className="flex w-full items-center justify-center gap-3 bg-primary py-4 font-display text-sm font-black uppercase tracking-widest text-base transition-colors hover:bg-acid hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
        >
          Initiate Checkout
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>

        {/* Trust signal. */}
        <div className="flex items-center justify-center gap-2 text-center font-display text-[9px] uppercase tracking-widest text-secondary">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          Secure encrypted transaction
        </div>
      </div>
    </aside>
  );
}
