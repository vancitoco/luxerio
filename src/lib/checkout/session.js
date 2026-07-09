/*
  Checkout session — which lines are being purchased and where they came from.
  sessionStorage-backed so /checkout survives a refresh.
  source: 'cart' (clear bag after confirmed order) | 'buy-now' (bag untouched).
*/
const KEY = 'vancito-checkout';

// Shared shape for a checkout line — display fields only; the backend re-prices
// everything server-side from variantId+quantity alone, never trusts these.
export function toCheckoutLine({ variantId, quantity, title, variant, price, image, currencyCode }) {
  return { variantId, quantity, title, variant, price, image, currencyCode: currencyCode || 'INR' };
}

export function startCheckout({ lines, source }) {
  sessionStorage.setItem(KEY, JSON.stringify({ lines, source, at: Date.now() }));
}

export function readCheckout() {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!Array.isArray(s.lines) || s.lines.length === 0) return null;
    return s;
  } catch {
    return null;
  }
}

export function clearCheckout() {
  sessionStorage.removeItem(KEY);
}
