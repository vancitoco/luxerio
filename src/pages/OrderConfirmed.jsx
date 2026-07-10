import { useEffect, useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { clearCheckout, readCheckout } from '../lib/checkout/session.js';

function fmt(amount, currencyCode = 'INR') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(amount);
}

export default function OrderConfirmed() {
  const [searchParams] = useSearchParams();
  const { clearBag } = useCart();

  const orderNumber = searchParams.get('n');
  const pending = searchParams.get('pending') === '1';
  const source = searchParams.get('src');
  const codBalance = Math.max(0, Number(searchParams.get('bal')) || 0);
  // Neither a real order number nor a pending flag — someone landed here
  // directly (bookmark, stale back-button, crawler), not via a real payment.
  const noOrder = !orderNumber && !pending;

  // Capture the session's line items before clearCheckout() wipes them, so
  // this page can still show what was purchased.
  const sessionRef = useRef(readCheckout());
  const session = sessionRef.current;

  useEffect(() => {
    clearCheckout();
    if (source === 'cart' && !noOrder) clearBag();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lines = session?.lines ?? [];
  const currency = lines[0]?.currencyCode || 'INR';
  const total = useMemo(() => lines.reduce((sum, l) => sum + l.price * l.quantity, 0), [lines]);

  if (noOrder) {
    return (
      <div className="mx-auto flex max-w-[640px] flex-col items-center gap-6 px-6 py-24 text-center">
        <div className="grid h-20 w-20 place-items-center border border-hairline">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-secondary">
            <path d="m9 9 6 6m0-6-6 6" />
            <circle cx="12" cy="12" r="10" />
          </svg>
        </div>
        <div>
          <span className="inline-block bg-primary px-3 py-1 font-display text-[10px] font-semibold uppercase tracking-widest text-base">
            No Order Found
          </span>
          <p className="mt-4 font-display text-sm uppercase tracking-widest text-primary">
            We couldn't find an order to confirm. If you just completed a payment, check your email for confirmation — otherwise head back to the shop.
          </p>
        </div>
        <Link
          to="/shop"
          className="border border-hairline px-8 py-3 font-display text-[10px] font-semibold uppercase tracking-widest text-primary transition-colors hover:border-acid hover:text-acid"
        >
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[720px] px-6 py-16 lg:py-24">
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="grid h-20 w-20 place-items-center border border-hairline">
          {pending ? (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-acid">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 3" />
            </svg>
          ) : (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-acid">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          )}
        </div>

        <div>
          <span className="inline-block bg-primary px-3 py-1 font-display text-[10px] font-semibold uppercase tracking-widest text-base">
            {pending ? 'Processing' : 'Order Placed'}
          </span>

          {pending ? (
            <p className="mt-4 font-display text-sm uppercase tracking-widest text-primary">
              Payment received — your order is being confirmed. You'll get the confirmation email shortly.
            </p>
          ) : (
            <>
              <h1 className="mt-4 font-display text-2xl font-semibold uppercase tracking-[0.08em] text-primary md:text-3xl">
                Order {orderNumber} Confirmed
              </h1>
              <p className="mt-3 font-display text-xs uppercase tracking-widest text-secondary">
                A confirmation email with your order details is on its way.
              </p>
              {codBalance > 0 && (
                <div className="mt-4 inline-block border border-acid bg-elevated px-4 py-2">
                  <p className="font-display text-xs font-semibold uppercase tracking-widest text-acid">
                    Balance due on delivery: {fmt(codBalance)}
                  </p>
                  <p className="mt-1 font-display text-[10px] uppercase tracking-wider text-secondary">
                    Please keep this amount ready in cash.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {lines.length > 0 && (
        <div className="mt-12 border border-hairline bg-surface">
          <div className="border-b border-hairline px-6 py-5">
            <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-primary">
              Order Summary
            </h2>
          </div>

          <div className="flex flex-col gap-4 px-6 py-5">
            {lines.map((line, i) => (
              <div key={`${line.variantId}-${i}`} className="flex items-center gap-4 border-b border-hairline pb-4 last:border-b-0 last:pb-0">
                <div className="h-16 w-14 shrink-0 overflow-hidden bg-elevated">
                  {line.image ? (
                    <img src={line.image} alt={line.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-elevated to-[#0a0a0a]" />
                  )}
                </div>
                <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                  <p className="font-display text-xs font-semibold uppercase leading-tight tracking-[0.08em] text-primary">
                    {line.title}
                  </p>
                  {line.variant && line.variant !== 'Default Title' && (
                    <p className="font-display text-[10px] uppercase tracking-wider text-secondary">
                      {line.variant}
                    </p>
                  )}
                  <p className="font-display text-[10px] uppercase tracking-wider text-secondary">
                    Qty {line.quantity}
                  </p>
                </div>
                <p className="shrink-0 font-display text-xs font-semibold tabular-nums text-primary">
                  {fmt(line.price * line.quantity, line.currencyCode || currency)}
                </p>
              </div>
            ))}

            <div className="h-px bg-hairline" />

            <div className="flex items-center justify-between">
              <span className="font-display text-[10px] font-bold uppercase tracking-widest text-secondary">
                Shipping
              </span>
              <span className="font-display text-[10px] font-bold uppercase tracking-widest text-acid">
                Free
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <span className="font-display text-[10px] font-semibold uppercase tracking-widest text-secondary">
                Total
              </span>
              <span className="font-display text-2xl font-semibold tabular-nums text-primary">
                {fmt(total, currency)}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="mt-10 flex justify-center">
        <Link
          to="/shop"
          className="border border-hairline px-8 py-3 font-display text-[10px] font-semibold uppercase tracking-widest text-primary transition-colors hover:border-acid hover:text-acid"
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
