import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import CartLine from '../components/CartLine.jsx';
import OrderSummary from '../components/OrderSummary.jsx';
import { trackEvent, EVENTS } from '../lib/analytics/ga4.js';

export default function Cart() {
  const { lines, count, subtotal } = useCart();

  // GA4 view_cart on mount.
  useEffect(() => {
    trackEvent(EVENTS.VIEW_CART, {
      value: subtotal,
      items: lines.map((l, i) => ({ item_id: l.merchandiseId, item_name: l.title, index: i, price: l.price })),
    });
  }, []);

  return (
    <div className="mx-auto max-w-[1280px] px-6 py-10 lg:px-16">
      {/* Header. */}
      <div className="mb-10 border-b border-hairline pb-6">
        <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.1em] text-primary md:text-5xl">
          Manifest: Cart
        </h1>
        {count > 0 && (
          <p className="mt-2 font-display text-[10px] uppercase tracking-widest text-secondary">
            {count} item{count !== 1 ? 's' : ''} in your bag.
          </p>
        )}
      </div>

      {lines.length === 0 ? (
        <EmptyCart />
      ) : (
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-12">
          {/* Line items. */}
          <div className="flex-1">
            {/* Desktop column headers. */}
            <div className="hidden grid-cols-[auto_1fr_auto_auto_auto] gap-4 border-b border-hairline pb-3 md:grid md:gap-6">
              {['Item', 'Details', 'Qty', 'Price', ''].map((h, i) => (
                <span key={i} className="font-display text-[9px] font-semibold uppercase tracking-widest text-secondary">
                  {h}
                </span>
              ))}
            </div>

            {lines.map((line) => (
              <CartLine key={line.lineId} line={line} />
            ))}

            {/* Continue shopping. */}
            <div className="mt-8">
              <Link
                to="/shop"
                className="flex w-fit items-center gap-2 font-display text-[10px] font-bold uppercase tracking-widest text-secondary transition-colors hover:text-acid"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M19 12H5M12 5l-7 7 7 7" />
                </svg>
                Continue Shopping
              </Link>
            </div>
          </div>

          {/* Order summary sidebar. */}
          <OrderSummary />
        </div>
      )}
    </div>
  );
}

function EmptyCart() {
  return (
    <div className="flex flex-col items-center gap-6 py-24 text-center">
      <div className="grid h-20 w-20 place-items-center border border-hairline">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-secondary">
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><path d="M3 6h18M16 10a4 4 0 0 1-8 0" />
        </svg>
      </div>
      <div>
        <span className="inline-block bg-primary px-3 py-1 font-display text-[10px] font-semibold uppercase tracking-widest text-base">
          Empty
        </span>
        <p className="mt-4 font-display text-xs uppercase tracking-widest text-secondary">
          Your bag is empty. Acquire some field gear.
        </p>
      </div>
      <Link
        to="/shop"
        className="border border-hairline px-8 py-3 font-display text-[10px] font-semibold uppercase tracking-widest text-primary transition-colors hover:border-acid hover:text-acid"
      >
        Access Shop
      </Link>
    </div>
  );
}
