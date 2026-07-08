import { Link } from 'react-router-dom';
import { trackEvent, EVENTS } from '../lib/analytics/ga4.js';

const IMG = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=600&q=75`;

const CATEGORIES = [
  // ── Apparel ───────────────────────────────────────────────
  { label: 'T-Shirts',           tag: 'TOPS',      href: '/shop?categories=t-shirts',      img: IMG('1521572163474-6864f9cf17ab') },
  { label: 'Shirts',             tag: 'TOPS',      href: '/shop?categories=shirts',        img: IMG('1596755094514-f87e34085b2c') },
  { label: 'Jeans',              tag: 'DENIM',     href: '/shop?categories=jeans',         img: IMG('1542272604-787c3835535d') },
  { label: 'Trousers',           tag: 'BOTTOMS',   href: '/shop?categories=trousers',      img: IMG('1624835567150-0c530a20d8cc') },

  // ── Footwear ──────────────────────────────────────────────
  { label: "Men's Shoes",        tag: 'FOOTWEAR',  href: '/shop?categories=mens-shoes',    img: IMG('1542291026-7eec264c27ff') },
  { label: "Women's Shoes",      tag: 'FOOTWEAR',  href: '/shop?categories=womens-shoes',  img: IMG('1543163521-1bf539c55dd2') },

  // ── Accessories ───────────────────────────────────────────
  { label: 'Watches for Men',    tag: 'WATCHES',   href: '/shop?categories=watches-men',   img: IMG('1523275335684-37898b6baf30') },
  { label: 'Watches for Women',  tag: 'WATCHES',   href: '/shop?categories=watches-women', img: IMG('1574358152207-c88cf120b77d') },
  { label: 'Sunglasses',         tag: 'EYEWEAR',   href: '/shop?categories=sunglasses',    img: IMG('1572635196237-14b3f281503f') },
];

export default function Categories() {
  const handleClick = (label) => {
    trackEvent(EVENTS.SELECT_ITEM, { item_list_name: 'categories_page', item_name: label });
  };

  return (
    <div className="mx-auto max-w-[1280px] px-6 py-10 lg:px-16">
      <div className="mb-10 border-b border-hairline pb-6">
        <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.1em] text-primary md:text-5xl">
          Categories
        </h1>
        <p className="mt-2 font-display text-[10px] uppercase tracking-widest text-secondary">
          {CATEGORIES.length} categories — select to browse.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {CATEGORIES.map((cat) => (
          <Link
            key={cat.href}
            to={cat.href}
            onClick={() => handleClick(cat.label)}
            className="group relative overflow-hidden bg-elevated"
            style={{ paddingBottom: '120%' }}
          >
            <img
              src={cat.img}
              alt={cat.label}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              loading="lazy"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

            <div className="absolute left-0 top-3 bg-primary px-2.5 py-0.5">
              <span className="font-display text-[8px] font-semibold uppercase tracking-widest text-base">
                {cat.tag}
              </span>
            </div>

            <div className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center border border-white/10 text-white/30 transition-all duration-200 group-hover:border-acid group-hover:text-acid">
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-4">
              <p
                className="font-display text-sm font-semibold uppercase leading-tight tracking-tight md:text-base"
                style={{ color: '#ffffff' }}
              >
                {cat.label}
              </p>
            </div>

            <div className="absolute inset-0 border border-transparent transition-colors duration-200 group-hover:border-acid" />
          </Link>
        ))}
      </div>
    </div>
  );
}
