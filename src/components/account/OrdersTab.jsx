import { useState } from 'react';

function fmt(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

const STATUS_STYLES = {
  FULFILLED:   'bg-primary text-base',
  UNFULFILLED: 'border border-hairline text-secondary',
  PARTIALLY_FULFILLED: 'border border-acid text-acid',
  IN_TRANSIT:  'bg-acid/20 text-acid',
  PAID:        '',
  PENDING:     '',
  REFUNDED:    'text-red-400',
};

export default function OrdersTab({ orders = [] }) {
  const [expanded, setExpanded] = useState(null);

  if (!orders.length) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <span className="inline-block border border-hairline px-3 py-1 font-display text-[9px] font-semibold uppercase tracking-widest text-secondary">
          No Orders
        </span>
        <p className="font-display text-xs uppercase tracking-wider text-secondary">
          No orders yet. Your field acquisitions will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Header row. */}
      <div className="hidden grid-cols-[1fr_auto_auto_auto_auto] gap-4 border-b border-hairline pb-3 md:grid">
        {['Order', 'Date', 'Status', 'Total', ''].map((h, i) => (
          <span key={i} className="font-display text-[9px] font-semibold uppercase tracking-widest text-secondary">
            {h}
          </span>
        ))}
      </div>

      {orders.map((order) => {
        const isOpen = expanded === order.id;
        const lines  = order.lineItems.edges.map((e) => e.node);
        const status = order.fulfillmentStatus ?? 'UNFULFILLED';

        return (
          <div key={order.id} className="border-b border-hairline">
            {/* Summary row. */}
            <button
              type="button"
              onClick={() => setExpanded(isOpen ? null : order.id)}
              aria-expanded={isOpen}
              className="grid w-full grid-cols-[1fr_auto] items-center gap-4 py-4 text-left md:grid-cols-[1fr_auto_auto_auto_auto]"
            >
              <span className="font-display text-sm font-semibold uppercase tracking-[0.08em] text-primary">
                #{order.orderNumber}
              </span>
              <span className="hidden font-display text-[10px] uppercase tracking-wider text-secondary md:block">
                {fmtDate(order.processedAt)}
              </span>
              <span
                className={`hidden px-2 py-0.5 font-display text-[9px] font-semibold uppercase tracking-widest md:inline-block ${
                  STATUS_STYLES[status] ?? 'text-secondary'
                }`}
              >
                {status.replace('_', ' ')}
              </span>
              <span className="hidden font-display text-sm font-semibold tabular-nums text-primary md:block">
                {fmt(order.currentTotalPrice.amount, order.currentTotalPrice.currencyCode)}
              </span>
              {/* Mobile: date + total stacked. */}
              <div className="flex flex-col items-end gap-0.5 md:hidden">
                <span className="font-display text-sm font-semibold tabular-nums text-primary">
                  {fmt(order.currentTotalPrice.amount, order.currentTotalPrice.currencyCode)}
                </span>
                <span className="font-display text-[9px] uppercase tracking-wider text-secondary">
                  {fmtDate(order.processedAt)}
                </span>
              </div>
              <svg
                width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                className={`shrink-0 text-secondary transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {/* Expanded line items. */}
            {isOpen && (
              <div className="mb-4 flex flex-col gap-3 pl-2">
                {lines.map((line, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="h-14 w-11 shrink-0 overflow-hidden bg-elevated">
                      {line.variant?.image ? (
                        <img src={line.variant.image.url} alt={line.variant.image.altText ?? line.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full bg-elevated" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-xs font-semibold uppercase leading-tight tracking-[0.08em] text-primary">
                        {line.title}
                      </p>
                      {line.variant?.title && line.variant.title !== 'Default Title' && (
                        <p className="font-display text-[10px] uppercase tracking-wider text-secondary">
                          {line.variant.title}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-display text-xs font-semibold tabular-nums text-primary">
                        {line.variant?.price
                          ? fmt(line.variant.price.amount * line.quantity, line.variant.price.currencyCode)
                          : '-'}
                      </p>
                      <p className="font-display text-[9px] uppercase tracking-wider text-secondary">
                        Qty {line.quantity}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
