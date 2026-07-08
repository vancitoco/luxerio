import { Link } from 'react-router-dom';
import { trackEvent, EVENTS } from '../lib/analytics/ga4.js';
import { markLoaded, onImgLoad } from '../lib/shopify/image.js';

const IMG = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1000&q=80`;

const CATEGORIES = [
  {
    label: 'T-Shirts',
    href: '/shop?categories=t-shirts',
    accent: 'col-span-2 row-span-2',
    img: IMG('1521572163474-6864f9cf17ab'),
  },
  {
    label: 'Jeans',
    href: '/shop?categories=jeans',
    accent: '',
    img: IMG('1542272604-787c3835535d'),
  },
  {
    label: "Men's Shoes",
    href: '/shop?categories=mens-shoes',
    accent: '',
    img: IMG('1542291026-7eec264c27ff'),
  },
];

export default function CategoryBento() {
  const handleClick = (label) => {
    trackEvent(EVENTS.SELECT_ITEM, { item_list_name: 'classifications', item_name: label });
  };

  return (
    <section className="mx-auto max-w-[1280px] px-6 py-20 lg:px-16">
      <div className="mb-10 flex items-end justify-between">
        <h2 className="font-display text-2xl font-semibold uppercase tracking-[0.15em] text-primary md:text-3xl">
          Shop By Category
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

            {/* Pronk-style bottom-left label. */}
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <p className="font-display text-sm font-semibold uppercase tracking-[0.25em] text-white md:text-base">
                {cat.label}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
