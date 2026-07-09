import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { clearCheckout } from '../lib/checkout/session.js';

export default function OrderConfirmed() {
  const [searchParams] = useSearchParams();
  const { clearBag } = useCart();

  const orderNumber = searchParams.get('n');
  const pending = searchParams.get('pending') === '1';
  const source = searchParams.get('src');
  // Neither a real order number nor a pending flag — someone landed here
  // directly (bookmark, stale back-button, crawler), not via a real payment.
  const noOrder = !orderNumber && !pending;

  useEffect(() => {
    clearCheckout();
    if (source === 'cart' && !noOrder) clearBag();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto flex max-w-[640px] flex-col items-center gap-6 px-6 py-24 text-center">
      <div className="grid h-20 w-20 place-items-center border border-hairline">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-acid">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </div>

      <div>
        <span className="inline-block bg-primary px-3 py-1 font-display text-[10px] font-semibold uppercase tracking-widest text-base">
          {noOrder ? 'No Order Found' : pending ? 'Processing' : 'Confirmed'}
        </span>

        {noOrder ? (
          <p className="mt-4 font-display text-sm uppercase tracking-widest text-primary">
            We couldn't find an order to confirm. If you just completed a payment, check your email for confirmation — otherwise head back to the shop.
          </p>
        ) : pending ? (
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
          </>
        )}
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
