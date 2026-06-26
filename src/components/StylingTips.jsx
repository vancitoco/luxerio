import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { trackEvent, EVENTS } from '../lib/analytics/ga4.js';

/*
  "Complete The Look" cross-sell.
  `products`: up to 3 recommendation nodes from Shopify productRecommendations.
  Falls back to a minimal empty state if store has no recommendations yet.
*/
export default function StylingTips({ products = [] }) {
  if (products.length === 0) return null;

  const [hero, ...rest] = products;

  return (
    <section className="border-t border-hairline pt-20">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-16">
        <h2 className="mb-10 text-center font-display text-2xl font-black uppercase tracking-tight text-primary md:text-3xl">
          Styling Tips
        </h2>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {/* Hero recommendation — spans 2 rows on md+. */}
          {hero && (
            <div className="relative col-span-2 row-span-2 overflow-hidden bg-elevated md:col-span-1 md:row-span-2">
              {hero.featuredImage && (
                <img
                  src={hero.featuredImage.url}
                  alt={hero.featuredImage.altText ?? hero.title}
                  className="h-full w-full object-cover"
                  style={{ minHeight: 360 }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <span className="mb-2 inline-block bg-acid px-2 py-0.5 font-display text-[9px] font-black uppercase tracking-widest text-black">
                  The Full Kit
                </span>
                <h3 className="font-display text-xl font-black uppercase leading-tight tracking-tight text-white">
                  Complete The Look
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-white/70">
                  {hero.description?.slice(0, 90) || `Pair with the ${hero.title} for maximum urban utility.`}
                </p>
                <Link
                  to={`/product/${hero.handle}`}
                  onClick={() => trackEvent(EVENTS.SELECT_ITEM, { item_name: hero.title, item_list_name: 'styling_tips' })}
                  className="mt-4 inline-block border border-white/30 px-5 py-2 font-display text-[10px] font-black uppercase tracking-widest text-white transition-colors hover:border-acid hover:text-acid"
                >
                  Shop Now
                </Link>
              </div>
            </div>
          )}

          {/* Secondary recommendations. */}
          {rest.map((p) => (
            <CrossSellCard key={p.id} product={p} />
          ))}
        </div>
      </div>
    </section>
  );
}

function CrossSellCard({ product }) {
  const { addLine } = useCart();

  const handleQuickAdd = (e) => {
    e.preventDefault();
    const variant = product.variants?.edges?.[0]?.node;
    if (!variant) return;
    addLine({
      merchandiseId: variant.id,
      title: product.title,
      variant: variant.title,
      price: parseFloat(variant.price?.amount ?? 0),
      image: product.featuredImage?.url,
    });
  };

  return (
    <Link
      to={`/product/${product.handle}`}
      onClick={() => trackEvent(EVENTS.SELECT_ITEM, { item_name: product.title, item_list_name: 'styling_tips' })}
      className="group relative overflow-hidden bg-elevated"
    >
      <div className="aspect-square overflow-hidden">
        {product.featuredImage ? (
          <img
            src={product.featuredImage.url}
            alt={product.featuredImage.altText ?? product.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-elevated to-[#0a0a0a]" />
        )}
      </div>
      <div className="flex items-center justify-between p-4">
        <p className="font-display text-xs font-black uppercase tracking-tight text-primary">
          {product.title}
        </p>
        <button
          type="button"
          onClick={handleQuickAdd}
          className="font-display text-[10px] font-bold uppercase tracking-widest text-acid hover:underline"
        >
          Add To Bag →
        </button>
      </div>
    </Link>
  );
}
