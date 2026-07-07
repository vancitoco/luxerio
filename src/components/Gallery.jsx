import { useState, useRef, useEffect } from 'react';
import { shopifyImg, shopifySrcSet, markLoaded, onImgLoad } from '../lib/shopify/image.js';

export default function Gallery({ images = [] }) {
  const [active, setActive] = useState(0);
  const touchStartX = useRef(null);

  // Preload adjacent images so arrow/swipe switches are instant.
  useEffect(() => {
    if (images.length < 2) return;
    [active + 1, active - 1].forEach((i) => {
      const img = images[(i + images.length) % images.length];
      if (img) new Image().src = shopifyImg(img.url, 1200);
    });
  }, [active, images]);

  const prev = () => setActive((i) => (i - 1 + images.length) % images.length);
  const next = () => setActive((i) => (i + 1) % images.length);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 40) {
      delta < 0 ? next() : prev();
    }
    touchStartX.current = null;
  };

  const mainImg = images[active];

  return (
    <div className="flex flex-col gap-3 lg:sticky lg:top-20">
      {/* Main image with swipe support. */}
      <div
        className="relative aspect-[3/4] w-full overflow-hidden bg-elevated"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {mainImg ? (
          <img
            key={mainImg.url}
            src={shopifyImg(mainImg.url, 1200)}
            srcSet={shopifySrcSet(mainImg.url, [800, 1200, 1600])}
            sizes="(min-width: 1024px) 50vw, 100vw"
            alt={mainImg.altText ?? 'Product image'}
            className="img-fade h-full w-full object-cover"
            loading="eager"
            fetchpriority="high"
            decoding="async"
            ref={markLoaded}
            onLoad={onImgLoad}
          />
        ) : (
          <GalleryPlaceholder />
        )}

        {/* Arrow buttons — visible on desktop hover, always visible on mobile when >1 image. */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Previous image"
              className="absolute left-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center border border-hairline bg-base/80 text-primary backdrop-blur transition-opacity hover:border-acid hover:text-acid md:opacity-0 md:group-hover:opacity-100"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next image"
              className="absolute right-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center border border-hairline bg-base/80 text-primary backdrop-blur transition-opacity hover:border-acid hover:text-acid md:opacity-0 md:group-hover:opacity-100"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </>
        )}

        {/* Dot indicators — mobile only. */}
        {images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 md:hidden" aria-hidden="true">
            {images.slice(0, 6).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Go to image ${i + 1}`}
                className={`h-1.5 w-1.5 rounded-full transition-colors ${
                  i === active ? 'bg-acid' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Thumbnail rail — desktop only when >1 image. */}
      {images.length > 1 && (
        <div className="hidden gap-2 md:flex" role="list" aria-label="Product images">
          {images.slice(0, 6).map((img, i) => (
            <button
              key={img.url}
              type="button"
              role="listitem"
              onClick={() => setActive(i)}
              aria-label={`View image ${i + 1}`}
              aria-pressed={i === active}
              className={`relative aspect-square w-16 shrink-0 overflow-hidden border transition-colors ${
                i === active ? 'border-acid' : 'border-hairline hover:border-primary'
              }`}
            >
              <img
                src={shopifyImg(img.url, 128)}
                alt={img.altText ?? ''}
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function GalleryPlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-elevated to-[#0a0a0a]">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.75" className="text-white/10" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="m21 15-5-5L5 21" />
      </svg>
    </div>
  );
}
