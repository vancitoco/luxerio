import { Link } from 'react-router-dom';
import { trackEvent, EVENTS } from '../lib/analytics/ga4.js';

const CATEGORIES = [
  {
    label: 'Outerwear',
    sub: 'Protocols',
    tag: 'OUTERWEAR',
    href: '/shop?category=outerwear',
    accent: 'col-span-2 row-span-2',
    img: 'https://picsum.photos/seed/outerwear-tactical-jacket/800/900',
  },
  {
    label: 'Eyewear',
    sub: null,
    tag: 'EYEWEAR',
    href: '/shop?category=eyewear',
    accent: '',
    img: 'https://picsum.photos/seed/eyewear-optic-lens/600/700',
  },
  {
    label: 'Footwear',
    sub: null,
    tag: 'FOOTWEAR',
    href: '/shop?category=footwear',
    accent: '',
    img: 'https://picsum.photos/seed/footwear-urban-boot/600/700',
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
