import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { motion } from 'motion/react';
import { useFeaturedProducts } from '../lib/shopify/hooks.js';
import ProductCard, { ProductCardSkeleton } from './ProductCard.jsx';
import { trackEvent, EVENTS } from '../lib/analytics/ga4.js';

export default function FeaturedProducts() {
  const { data: products = [], isLoading } = useFeaturedProducts({ first: 8 });

  // GA4: view_item_list when products are visible.
  useEffect(() => {
    if (products.length > 0) {
      trackEvent(EVENTS.VIEW_ITEM_LIST, {
        item_list_name: 'best_sellers',
        items: products.map((p, i) => ({ item_id: p.id, item_name: p.title, index: i })),
      });
    }
  }, [products]);

  const isEmpty = !isLoading && products.length === 0;

  return (
    <section className="mx-auto max-w-[1280px] px-6 py-20 lg:px-16">
      {/* Section header. */}
      <div className="mb-10 flex flex-col items-center gap-4">
        <h2 className="font-display text-2xl font-semibold uppercase tracking-[0.15em] text-primary md:text-3xl">
          Best Sellers
        </h2>
        <Link
          to="/shop"
          className="border border-primary px-8 py-2.5 font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-primary transition-colors hover:bg-primary hover:text-base active:scale-[0.98]"
        >
          View All
        </Link>
      </div>

      {isEmpty ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-4">
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)
            : products.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.5, delay: Math.min(i, 4) * 0.07, ease: [0.16, 1, 0.3, 1] }}
                >
                  <ProductCard product={p} listName="best_sellers" position={i} />
                </motion.div>
              ))}
        </div>
      )}
    </section>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center gap-4 border border-hairline">
      <span className="bg-primary px-3 py-1 font-display text-[10px] font-semibold uppercase tracking-widest text-base">
        Coming Soon
      </span>
      <p className="font-display text-xs uppercase tracking-widest text-secondary">
        New season drops loading. Check back shortly.
      </p>
    </div>
  );
}
