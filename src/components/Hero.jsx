import { Link } from 'react-router-dom';
import { ArrowRight } from '@phosphor-icons/react';
import { trackEvent, EVENTS } from '../lib/analytics/ga4.js';

export default function Hero({ heroBg }) {
  const handleCta = () => {
    trackEvent(EVENTS.SELECT_PROMOTION, {
      promotion_name: 'hero_new_drop',
      creative_slot: 'hero',
    });
  };

  return (
    <section
      className={`relative min-h-[100dvh] w-full overflow-hidden${heroBg ? ' bg-cover bg-center' : ''}`}
      style={heroBg ? { backgroundImage: `url(${heroBg})` } : undefined}
    >
      {!heroBg && <div className="absolute inset-0 bg-[#0a0a0a]" />}

      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(198,245,0,0.6) 1px, transparent 1px),
            linear-gradient(90deg, rgba(198,245,0,0.6) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {heroBg && <div className="absolute inset-0 bg-black/60" />}

      <div className="relative z-10 flex h-full min-h-[100dvh] flex-col justify-end px-6 pb-20 lg:px-16">
        <span className="mb-6 inline-flex w-fit items-center bg-acid px-3 py-1">
          <span className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-black">
            New Drop / FW25
          </span>
        </span>

        <h1 className="max-w-3xl font-display text-[clamp(3.5rem,10vw,8rem)] font-black uppercase leading-[0.9] tracking-tight text-white">
          New
          <br />
          Drop
        </h1>

        <p className="mt-6 max-w-sm text-xs uppercase tracking-[0.15em] text-white/60">
          Engineered for the uncompromising.
          <br />
          Technical apparel for urban tactics.
        </p>

        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            to="/shop"
            onClick={handleCta}
            className="inline-flex items-center gap-3 border border-white/20 bg-white/10 px-6 py-3 font-display text-xs font-bold uppercase tracking-widest text-white backdrop-blur transition-colors hover:border-acid hover:bg-acid hover:text-black active:scale-[0.98]"
          >
            Access Season
            <ArrowRight size={14} weight="bold" />
          </Link>
          <Link
            to="/shop"
            className="inline-flex items-center gap-3 px-6 py-3 font-display text-xs font-bold uppercase tracking-widest text-white/60 transition-colors hover:text-acid active:scale-[0.98]"
          >
            View All
          </Link>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 h-[2px] w-full bg-acid" />
    </section>
  );
}
