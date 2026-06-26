import { Link } from 'react-router-dom';
import { trackEvent, EVENTS } from '../lib/analytics/ga4.js';

const CATEGORIES = [
  {
    label: 'Outerwear',
    sub: 'Field Protocols',
    tag: 'OUTERWEAR',
    href: '/shop?category=outerwear',
    grid: 'md:col-span-2 md:row-span-2',
    img: 'https://picsum.photos/seed/outerwear-field-jacket-dark/800/900',
  },
  {
    label: 'T-Shirts',
    sub: 'Base Layer',
    tag: 'T-SHIRTS',
    href: '/shop?category=t-shirt',
    grid: '',
    img: 'https://picsum.photos/seed/tshirt-base-layer-mono/600/700',
  },
  {
    label: 'Eyewear',
    sub: 'Optic Systems',
    tag: 'EYEWEAR',
    href: '/shop?category=eyewear',
    grid: '',
    img: 'https://picsum.photos/seed/eyewear-optic-tactical/600/700',
  },
  {
    label: 'Footwear',
    sub: 'Ground Tactical',
    tag: 'FOOTWEAR',
    href: '/shop?category=footwear',
    grid: 'md:col-span-3',
    img: 'https://picsum.photos/seed/footwear-ground-boot-dark/1200/600',
  },
];

export default function Categories() {
  const handleClick = (label) => {
    trackEvent(EVENTS.SELECT_ITEM, { item_list_name: 'categories_page', item_name: label });
  };

  return (
    <div className="mx-auto max-w-[1280px] px-6 py-10 lg:px-16">
      {/* Header. */}
      <div className="mb-10 border-b border-hairline pb-6">
        <h1 className="font-display text-4xl font-black uppercase tracking-tight text-primary md:text-5xl">
          Classifications
        </h1>
        <p className="mt-2 font-display text-[10px] uppercase tracking-widest text-secondary">
          Select a category to browse the collection.
        </p>
      </div>

      {/* Bento grid. */}
      <div
        className="grid grid-cols-2 gap-3 md:grid-cols-3"
        style={{ minHeight: 600 }}
      >
        {CATEGORIES.map((cat) => (
          <Link
            key={cat.label}
            to={cat.href}
            onClick={() => handleClick(cat.label)}
            className={`group relative overflow-hidden bg-elevated ${cat.grid}`}
            style={{ minHeight: 220 }}
          >
            {/* Photo layer — swap src for Shopify CDN image once uploaded. */}
            <img
              src={cat.img}
              alt={cat.label}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              loading="lazy"
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
              <p className="font-display text-xl font-black uppercase leading-tight tracking-tight text-white md:text-2xl">
                {cat.label}
              </p>
              {cat.sub && (
                <p className="mt-0.5 font-display text-[10px] font-bold uppercase tracking-widest text-acid">
                  {cat.sub}
                </p>
              )}
            </div>

            {/* Hover border. */}
            <div className="absolute inset-0 border border-transparent transition-colors duration-200 group-hover:border-acid" />

            {/* Arrow indicator. */}
            <div className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center border border-white/10 text-white/30 transition-all duration-200 group-hover:border-acid group-hover:text-acid">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
