import ProductCard, { ProductCardSkeleton } from './ProductCard.jsx';
import { trackEvent, EVENTS } from '../lib/analytics/ga4.js';
import { useEffect } from 'react';

export default function ProductGrid({ products = [], isLoading, isFetchingMore, hasNextPage, onLoadMore }) {
  useEffect(() => {
    if (products.length > 0) {
      trackEvent(EVENTS.VIEW_ITEM_LIST, {
        item_list_name: 'shop_all',
        items: products.map((p, i) => ({ item_id: p.id, item_name: p.title, index: i })),
      });
    }
  }, [products]);

  if (!isLoading && products.length === 0) {
    return <EmptyGrid />;
  }

  return (
    <div className="flex-1">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <ProductCardSkeleton key={i} />)
          : products.map((p, i) => (
              <ProductCard key={p.id} product={p} listName="shop_all" position={i} />
            ))}
      </div>

      {/* Load more. */}
      {!isLoading && hasNextPage && (
        <div className="mt-12 flex justify-center">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isFetchingMore}
            className="border border-hairline px-12 py-3 font-display text-[10px] font-black uppercase tracking-widest text-primary transition-colors hover:border-acid hover:text-acid disabled:opacity-40"
          >
            {isFetchingMore ? 'Loading…' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
}

function EmptyGrid() {
  return (
    <div className="flex-1">
      <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 border border-hairline">
        <span className="bg-acid px-3 py-1 font-display text-[10px] font-black uppercase tracking-widest text-black">
          No Results
        </span>
        <p className="font-display text-xs uppercase tracking-widest text-secondary">
          Try adjusting your filters or check back soon.
        </p>
      </div>
    </div>
  );
}
