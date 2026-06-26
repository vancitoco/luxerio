import { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { storefrontQuery } from '../lib/shopify/client.js';
import {
  CART_CREATE,
  CART_LINES_ADD,
  CART_LINES_UPDATE,
  CART_LINES_REMOVE,
  CART_DISCOUNT_CODES_UPDATE,
} from '../lib/shopify/mutations.js';
import { trackEvent, EVENTS } from '../lib/analytics/ga4.js';

const CartContext = createContext(null);
const CART_ID_KEY = 'luxerio-cart-id';

// Parse Shopify cart response into a flat line array for easy rendering.
function parseLines(cart) {
  return (
    cart?.lines?.edges?.map(({ node }) => ({
      lineId: node.id,
      merchandiseId: node.merchandise?.id,
      title: node.merchandise?.product?.title ?? '',
      variant: node.merchandise?.title ?? '',
      price: parseFloat(node.merchandise?.price?.amount ?? 0),
      currencyCode: node.merchandise?.price?.currencyCode ?? 'USD',
      image: node.merchandise?.product?.featuredImage?.url ?? null,
      qty: node.quantity,
    })) ?? []
  );
}

export function CartProvider({ children }) {
  const [cartId, setCartId]       = useState(() => localStorage.getItem(CART_ID_KEY));
  const [checkoutUrl, setCheckout] = useState(null);
  const [lines, setLines]         = useState([]);
  const [cost, setCost]           = useState(null);   // { subtotal, total } in currency
  const [discountCodes, setDiscounts] = useState([]);
  const [loading, setLoading]     = useState(false);

  // Sync cartId → localStorage.
  useEffect(() => {
    if (cartId) localStorage.setItem(CART_ID_KEY, cartId);
    else localStorage.removeItem(CART_ID_KEY);
  }, [cartId]);

  // Hydrate existing cart from Shopify on first mount.
  useEffect(() => {
    if (!cartId) return;
    storefrontQuery(
      /* GraphQL */ `
        query Cart($id: ID!) {
          cart(id: $id) {
            id checkoutUrl
            lines(first: 50) { edges { node { id quantity merchandise {
              ... on ProductVariant {
                id title price { amount currencyCode }
                product { title featuredImage { url altText } }
              }
            } } } }
            cost { subtotalAmount { amount currencyCode } totalAmount { amount currencyCode } }
            discountCodes { code applicable }
          }
        }
      `,
      { id: cartId },
    )
      .then((d) => {
        if (!d.cart) { setCartId(null); return; }
        applyCart(d.cart);
      })
      .catch(() => setCartId(null));
  }, []);

  function applyCart(cart) {
    setCartId(cart.id);
    setCheckout(cart.checkoutUrl);
    setLines(parseLines(cart));
    setCost({
      subtotal: parseFloat(cart.cost?.subtotalAmount?.amount ?? 0),
      total:    parseFloat(cart.cost?.totalAmount?.amount ?? 0),
      currencyCode: cart.cost?.subtotalAmount?.currencyCode ?? 'USD',
    });
    setDiscounts(cart.discountCodes ?? []);
  }

  // --- mutations ---

  const addLine = useCallback(async ({ merchandiseId, qty = 1, title, variant, price, image }) => {
    setLoading(true);
    try {
      const lineInput = { merchandiseId, quantity: qty };
      let cart;
      if (!cartId) {
        const d = await storefrontQuery(CART_CREATE, { lines: [lineInput] });
        cart = d.cartCreate?.cart;
      } else {
        const d = await storefrontQuery(CART_LINES_ADD, { cartId, lines: [lineInput] });
        cart = d.cartLinesAdd?.cart;
      }
      if (cart) applyCart(cart);
      trackEvent(EVENTS.ADD_TO_CART, { item_id: merchandiseId, value: price });
    } catch {
      // Shopify unavailable — fall back to optimistic local state.
      setLines((prev) => {
        const i = prev.findIndex((l) => l.merchandiseId === merchandiseId);
        if (i > -1) {
          const next = [...prev];
          next[i] = { ...next[i], qty: next[i].qty + qty };
          return next;
        }
        return [...prev, { merchandiseId, qty, title, variant, price, image, lineId: `local-${merchandiseId}` }];
      });
    } finally {
      setLoading(false);
    }
  }, [cartId]);

  const updateQty = useCallback(async (lineId, qty) => {
    setLines((prev) =>
      prev.map((l) => (l.lineId === lineId ? { ...l, qty } : l)).filter((l) => l.qty > 0),
    );
    if (!cartId || lineId.startsWith('local-')) return;
    try {
      const d = await storefrontQuery(CART_LINES_UPDATE, {
        cartId,
        lines: [{ id: lineId, quantity: qty }],
      });
      if (d.cartLinesUpdate?.cart) applyCart(d.cartLinesUpdate.cart);
    } catch {}
  }, [cartId]);

  const removeLine = useCallback(async (lineId, merchandiseId) => {
    setLines((prev) => prev.filter((l) => l.lineId !== lineId));
    trackEvent(EVENTS.REMOVE_FROM_CART, { item_id: merchandiseId });
    if (!cartId || lineId.startsWith('local-')) return;
    try {
      const d = await storefrontQuery(CART_LINES_REMOVE, { cartId, lineIds: [lineId] });
      if (d.cartLinesRemove?.cart) applyCart(d.cartLinesRemove.cart);
    } catch {}
  }, [cartId]);

  const applyDiscount = useCallback(async (code) => {
    if (!cartId) return { error: 'Cart empty.' };
    try {
      const d = await storefrontQuery(CART_DISCOUNT_CODES_UPDATE, {
        cartId,
        discountCodes: [code],
      });
      const cart = d.cartDiscountCodesUpdate?.cart;
      if (cart) applyCart(cart);
      const applied = cart?.discountCodes?.find((c) => c.code === code);
      return applied?.applicable ? { ok: true } : { error: 'Code invalid or not applicable.' };
    } catch {
      return { error: 'Could not apply code. Try again.' };
    }
  }, [cartId]);

  const initiateCheckout = useCallback(() => {
    trackEvent(EVENTS.BEGIN_CHECKOUT, {
      value: cost?.total,
      currency: cost?.currencyCode,
      items: lines.map((l, i) => ({ item_id: l.merchandiseId, item_name: l.title, index: i, price: l.price })),
    });
    if (checkoutUrl) window.location.href = checkoutUrl;
  }, [checkoutUrl, cost, lines]);

  const value = useMemo(() => {
    const count = lines.reduce((n, l) => n + l.qty, 0);
    const subtotal = cost?.subtotal ?? lines.reduce((s, l) => s + l.price * l.qty, 0);
    return { lines, addLine, updateQty, removeLine, applyDiscount, initiateCheckout, count, subtotal, cost, discountCodes, checkoutUrl, loading };
  }, [lines, addLine, updateQty, removeLine, applyDiscount, initiateCheckout, cost, discountCodes, checkoutUrl, loading]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
