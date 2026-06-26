import { Link } from 'react-router-dom';
import { trackEvent, EVENTS } from '../lib/analytics/ga4.js';

/*
  Shared product card — used in FeaturedProducts (Home) and ProductGrid (Shop All).
  Variant badge: inferred from Shopify `tags` array.
  Tags: 'new-drop' → NEW DROP, 'restocked' → RESTOCKED, 'sold-out' → SOLD OUT (diagonal).
*/
const BADGE_MAP = {
  'new-drop': { label: 'New Drop', style: 'bg-acid text-black' },
  restocked: { label: 'Restocked', style: 'bg-white text-black' },
  'sold-out': { label: 'Sold Out', style: 'bg-[#1c1c1c] text-white/60' },
};

function getBadge(tags = []) {
  for (const [key, val] of Object.entries(BADGE_MAP)) {
    if (tags.includes(key)) return val;
  }
  return null;
}

function fmt(amount, currencyCode = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(amount);
}

export default function ProductCard({ product, listName = 'product_list', position }) {
  if (!product) return <ProductCardSkeleton />;

  const { handle, title, featuredImage, priceRange, tags = [], variants } = product;
  const price = priceRange?.minVariantPrice;
  const badge = getBadge(tags);
  const soldOut = tags.includes('sold-out') || variants?.edges?.[0]?.node?.availableForSale === false;

  const handleClick = () => {
    trackEvent(EVENTS.SELECT_ITEM, {
      item_list_name: listName,
      items: [{ item_id: product.id, item_name: title, index: position }],
    });
  };

  return (
    <Link
      to={`/product/${handle}`}
      onClick={handleClick}
      className="group relative flex flex-col overflow-hidden bg-surface"
    >
      {/* Image area. */}
      <div className="relative aspect-[3/4] overflow-hidden bg-elevated">
        {featuredImage ? (
          <img
            src={featuredImage.url}
            alt={featuredImage.altText || title}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          /* Placeholder when no Shopify image yet. */
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-elevated to-[#0a0a0a]">
            <ImagePlaceholderIcon />
          </div>
        )}

        {/* Status badge. */}
        {badge && (
          <div className={`absolute left-3 top-3 px-2 py-1 font-display text-[9px] font-black uppercase tracking-widest ${badge.style}`}>
            {badge.label}
          </div>
        )}

        {/* Sold-out overlay. */}
        {soldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="font-display text-xs font-black uppercase tracking-widest text-white/70">
              Sold Out
            </span>
          </div>
        )}
      </div>

      {/* Info. */}
      <div className="flex flex-col gap-1 p-4">
        <p className="font-display text-sm font-black uppercase leading-tight tracking-tight text-primary transition-colors group-hover:text-acid">
          {title}
        </p>
        {price && (
          <p className="font-display text-sm font-bold text-acid">
            {fmt(price.amount, price.currencyCode)}
          </p>
        )}
      </div>

      {/* Hover acid bottom border. */}
      <div className="absolute bottom-0 left-0 h-[2px] w-full scale-x-0 bg-acid transition-transform duration-300 group-hover:scale-x-100" />
    </Link>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden bg-surface">
      <div className="aspect-[3/4] animate-pulse bg-elevated" />
      <div className="flex flex-col gap-2 p-4">
        <div className="h-4 w-3/4 animate-pulse rounded bg-elevated" />
        <div className="h-4 w-1/3 animate-pulse rounded bg-elevated" />
      </div>
    </div>
  );
}

function ImagePlaceholderIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-white/10">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  );
}
