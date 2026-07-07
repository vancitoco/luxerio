import { Link } from 'react-router-dom';
import { trackEvent, EVENTS } from '../lib/analytics/ga4.js';
import { markLoaded, onImgLoad } from '../lib/shopify/image.js';

const IMG = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=800&q=80`;

const CATEGORIES = [
  {
    label: "Men's Shoes",
    sub: 'Footwear',
    tag: 'FOOTWEAR',
    href: '/shop?categories=mens-shoes',
    accent: 'col-span-2 row-span-2',
    img: IMG('1542291026-7eec264c27ff'),
  },
  {
    label: 'T-Shirts',
    sub: null,
    tag: 'TOPS',
    href: '/shop?categories=t-shirts',
    accent: '',
    img: IMG('1521572163474-6864f9cf17ab'),
  },
  {
    label: 'Watches',
    sub: null,
    tag: 'ACCESSORIES',
    href: '/shop?categories=watches-men',
    accent: '',
    img: IMG('1523275335684-37898b6baf30'),
  },
];

export default function CategoryBento() {
  const handleClick = (label) => {
    trackEvent(EVENTS.SELECT_ITEM, { item_list_name: 'classifications', item_name: label });
  };

  return (
    <section className="mx-auto max-w-[1280px] px-6 py-20 lg:px-16">
      <div className="mb-10 flex items-end justify-between">
        <h2 className="font-display text-2xl font-black uppercase tracking-tight text-primary md:text-3xl">
          Classifications
        </h2>
        <div className="h-[2px] flex-1 mx-8 bg-hairline" />
      </div>

      <div className="grid grid-cols-2 grid-rows-2 gap-3 md:grid-cols-3" style={{ minHeight: 480 }}>
        {CATEGORIES.map((cat, i) => (
          <Link
            key={cat.label}
            to={cat.href}
            onClick={() => handleClick(cat.label)}
            className={`group relative overflow-hidden bg-elevated ${cat.accent}`}
          >
            {/* Photo layer — swap src for Shopify CDN image once uploaded. */}
            <img
              src={cat.img}
              alt={cat.label}
              className="img-fade absolute inset-0 h-full w-full object-cover group-hover:scale-105"
              loading="lazy"
              decoding="async"
              ref={markLoaded}
              onLoad={onImgLoad}
            />

            {/* Dark scrim so text stays legible over photo. */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />

            {/* Acid corner tag. */}
            <div className="absolute left-0 top-4 bg-acid px-3 py-1">
              <span className="font-display text-[9px] font-black uppercase tracking-widest text-black">
                {cat.tag}
              </span>
            </div>

            {/* Label. */}
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <p className="font-display text-lg font-black uppercase leading-tight tracking-tight text-white md:text-xl">
                {cat.label}
                {cat.sub && (
                  <span className="block text-xs font-bold text-acid">{cat.sub}</span>
                )}
              </p>
            </div>

            {/* Hover acid border. */}
            <div className="absolute inset-0 border border-transparent transition-colors group-hover:border-acid" />
          </Link>
        ))}
      </div>
    </section>
  );
}
