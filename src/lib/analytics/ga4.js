import { EVENTS } from './events.js';

export { EVENTS };

/*
  GA4 wrapper. MOCK MODE for Phase A: if no measurement id is set, events are
  logged to console instead of sent. Swap VITE_GA4_ID in .env to go live —
  no component changes needed. Shopify native tracking fires on the hosted
  checkout (Phase E redirect), complementing these client-side events.
*/
const GA4_ID = import.meta.env.VITE_GA4_ID;
const MOCK = !GA4_ID;

export function initAnalytics() {
  if (MOCK) {
    console.info('[GA4 mock] analytics in mock mode — set VITE_GA4_ID to go live');
    window.dataLayer = window.dataLayer || [];
    return;
  }
  // Real gtag bootstrap.
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', GA4_ID, { send_page_view: false });
}

export function trackEvent(name, params = {}) {
  if (MOCK) {
    console.info('[GA4 mock]', name, params);
    window.dataLayer?.push({ event: name, ...params });
    return;
  }
  window.gtag?.('event', name, params);
}

export function trackPageView(path) {
  trackEvent(EVENTS.PAGE_VIEW, { page_path: path });
}
