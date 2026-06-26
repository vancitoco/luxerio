import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowRight } from '@phosphor-icons/react';
import { useFeaturedProducts } from '../lib/shopify/hooks.js';
import ProductCard, { ProductCardSkeleton } from './ProductCard.jsx';
import { trackEvent, EVENTS } from '../lib/analytics/ga4.js';

export default function FeaturedProducts() {
  const { data: products = [], isLoading } = useFeaturedProducts({ first: 4 });

  // GA4: view_item_list when products are visible.
  useEffect(() => {
    if (products.length > 0) {
      trackEvent(EVENTS.VIEW_ITEM_LIST, {
        item_list_name: 'recent_acquisitions',
        items: products.map((p, i) => ({ item_id: p.id, item_name: p.title, index: i })),
      });
    }
  }, [products]);

  const isEmpty = !isLoading && products.length === 0;

  return (
    <section className="mx-auto max-w-[1280px] px-6 py-20 lg:px-16">
      {/* Section header. */}
      <div className="mb-10 flex items-center justify-between">
        <div className="flex items-end gap-8">
          <h2 className="font-display text-2xl font-black uppercase tracking-tight text-primary md:text-3xl">
            Recent Acquisitions
          </h2>
          <div className="hidden h-[2px] w-24 bg-acid md:block" />
        </div>
        <Link
          to="/shop"
          className="flex items-center gap-2 font-display text-xs font-bold uppercase tracking-widest text-acid transition-opacity hover:opacity-70 active:scale-[0.98]"
        >
          View All
          <ArrowRight size={12} weight="bold" />
        </Link>
      </div>

      {isEmpty ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
            : products.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.5, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                >
                  <ProductCard product={p} listName="recent_acquisitions" position={i} />
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
      <span className="bg-acid px-3 py-1 font-display text-[10px] font-black uppercase tracking-widest text-black">
        Coming Soon
      </span>
      <p className="font-display text-xs uppercase tracking-widest text-secondary">
        New season drops loading. Check back shortly.
      </p>
    </div>
  );
}
