/*
  Shopify CDN image helpers.
  The CDN resizes on the fly via the `width` query param and auto-serves
  WebP/AVIF based on the Accept header — no format param needed.
*/

export function shopifyImg(url, width = 600) {
  if (!url) return url;
  try {
    const u = new URL(url);
    u.searchParams.set('width', width);
    return u.toString();
  } catch {
    return url;
  }
}

// srcSet string across standard breakpoint widths for responsive loading.
export function shopifySrcSet(url, widths = [400, 600, 800]) {
  if (!url) return undefined;
  return widths.map((w) => `${shopifyImg(url, w)} ${w}w`).join(', ');
}

// Fade-in helpers — pair with `className="img-fade"` (defined in index.css).
// The ref callback covers cached images where onLoad never fires.
export function markLoaded(el) {
  if (el && el.complete) el.classList.add('img-loaded');
}

export function onImgLoad(e) {
  e.currentTarget.classList.add('img-loaded');
}
