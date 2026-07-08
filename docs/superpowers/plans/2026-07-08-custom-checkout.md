# Custom On-Site Checkout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In-app `/checkout` with embedded Razorpay modal; Shopify order created server-side after verified payment. No redirect to Shopify's hosted checkout.

**Architecture:** Three Netlify Functions (create-payment, confirm-order, razorpay-webhook) sharing a small lib (Shopify Admin/Storefront helpers, Razorpay REST helpers, HMAC verify). Frontend adds `/checkout` + `/order-confirmed` routes and swaps the two checkout entry points. No new frontend deps; backend uses only `node:crypto` + `fetch` (no Razorpay SDK).

**Tech Stack:** Vite/React SPA (existing), Netlify Functions (Node 18+, ESM), Shopify Admin GraphQL API 2024-10, Shopify Storefront API 2024-10 (existing token), Razorpay Orders REST API + Checkout.js.

**Spec:** `docs/superpowers/specs/2026-07-08-custom-checkout-design.md`

**Verification model:** No test framework in repo. Each function gets verified with `netlify dev` + curl against Razorpay test mode; frontend via preview browser. Final E2E needs user-provided keys (Razorpay test keys, Shopify Admin token) — Tasks 1–5 build and unit-verify what's possible without them; Task 6 is the keyed E2E.

**Blocked-on-user prerequisites (needed by Task 6, not before):**
`RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` (test mode), `SHOPIFY_ADMIN_TOKEN`
(custom app, `write_orders` + `read_products`), Netlify site + `RAZORPAY_WEBHOOK_SECRET` after webhook registration.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `netlify.toml` | Create | Build/publish/functions config, SPA redirect |
| `netlify/functions/lib/shopify.js` | Create | Admin GraphQL client, price fetch, discounted-total via cart, order search/create |
| `netlify/functions/lib/razorpay.js` | Create | Orders REST create, signature + webhook HMAC verify |
| `netlify/functions/lib/payload.js` | Create | Checkout payload validate + notes encode/decode |
| `netlify/functions/create-payment.js` | Create | Price server-side → Razorpay order |
| `netlify/functions/confirm-order.js` | Create | Verify signature → idempotent Shopify orderCreate |
| `netlify/functions/razorpay-webhook.js` | Create | payment.captured safety net |
| `src/lib/checkout/session.js` | Create | Checkout lines state (router state + sessionStorage) |
| `src/pages/Checkout.jsx` | Create | Address form + summary + Razorpay modal |
| `src/pages/OrderConfirmed.jsx` | Create | Thank-you page, clears bag for cart-path |
| `src/App.jsx` | Modify | Register 2 routes |
| `src/context/CartContext.jsx` | Modify | initiateCheckout → navigate('/checkout') |
| `src/pages/Product.jsx` | Modify | handleBuyNow → navigate('/checkout'); trust-line copy |
| `.env.example` | Create | Document all env vars |

---

### Task 1: Netlify scaffolding + shared backend lib

**Files:** Create `netlify.toml`, `netlify/functions/lib/shopify.js`, `netlify/functions/lib/razorpay.js`, `netlify/functions/lib/payload.js`, `.env.example`

- [ ] **Step 1: `netlify.toml`**

```toml
[build]
  command = "npm run build"
  publish = "dist"

[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

- [ ] **Step 2: `netlify/functions/lib/razorpay.js`**

```js
import crypto from 'node:crypto';

const RZP_BASE = 'https://api.razorpay.com/v1';

function authHeader() {
  const creds = Buffer.from(
    `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
  ).toString('base64');
  return `Basic ${creds}`;
}

export async function createRazorpayOrder({ amountPaise, receipt, notes }) {
  const res = await fetch(`${RZP_BASE}/orders`, {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: amountPaise, currency: 'INR', receipt, notes }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Razorpay order create failed: ${JSON.stringify(data.error ?? data)}`);
  return data; // { id, amount, currency, notes, ... }
}

export async function fetchRazorpayOrder(orderId) {
  const res = await fetch(`${RZP_BASE}/orders/${orderId}`, {
    headers: { Authorization: authHeader() },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Razorpay order fetch failed: ${JSON.stringify(data.error ?? data)}`);
  return data;
}

// Checkout.js success payload signature: HMAC_SHA256(order_id + "|" + payment_id, key_secret)
export function verifyPaymentSignature({ orderId, paymentId, signature }) {
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

// Webhook signature: HMAC_SHA256(rawBody, webhook_secret) in X-Razorpay-Signature
export function verifyWebhookSignature(rawBody, signature) {
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
```

(Note: wrap both `timingSafeEqual` calls — throw on length mismatch — in a
try/catch returning false.)

- [ ] **Step 3: `netlify/functions/lib/shopify.js`**

```js
const SHOP_DOMAIN = process.env.SHOPIFY_SHOP_DOMAIN || 'luxerio-62.myshopify.com';
const API_VERSION = '2024-10';

async function adminQuery(query, variables) {
  const res = await fetch(`https://${SHOP_DOMAIN}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  const data = await res.json();
  if (data.errors?.length) throw new Error(`Admin API error: ${JSON.stringify(data.errors)}`);
  return data.data;
}

async function storefrontQuery(query, variables) {
  const res = await fetch(`https://${SHOP_DOMAIN}/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'X-Shopify-Storefront-Access-Token': process.env.SHOPIFY_STOREFRONT_TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  const data = await res.json();
  if (data.errors?.length) throw new Error(`Storefront API error: ${JSON.stringify(data.errors)}`);
  return data.data;
}

// Server-side authoritative total. Creates a throwaway Storefront cart with the
// requested lines (validates variants exist + purchasable), optionally applies a
// discount code, and returns Shopify's computed total + per-line prices.
export async function priceCart(lines, discountCode) {
  const d = await storefrontQuery(
    /* GraphQL */ `
      mutation PriceCart($lines: [CartLineInput!]!) {
        cartCreate(input: { lines: $lines }) {
          cart {
            id
            cost { subtotalAmount { amount } totalAmount { amount } }
            lines(first: 50) { edges { node { quantity merchandise { ... on ProductVariant { id title price { amount }
              product { title } } } } } }
          }
          userErrors { field message }
        }
      }
    `,
    { lines: lines.map((l) => ({ merchandiseId: l.variantId, quantity: l.quantity })) },
  );
  const cart = d.cartCreate?.cart;
  const errs = d.cartCreate?.userErrors;
  if (!cart) throw new Error(`cartCreate failed: ${JSON.stringify(errs)}`);
  // Line-count mismatch = some variant invalid/unavailable → reject.
  if (cart.lines.edges.length !== lines.length) throw new Error('One or more items are unavailable.');

  let total = parseFloat(cart.cost.totalAmount.amount);
  let discount = null;
  if (discountCode) {
    const dd = await storefrontQuery(
      /* GraphQL */ `
        mutation ApplyCode($cartId: ID!, $codes: [String!]!) {
          cartDiscountCodesUpdate(cartId: $cartId, discountCodes: $codes) {
            cart { cost { totalAmount { amount } } discountCodes { code applicable } }
            userErrors { field message }
          }
        }
      `,
      { cartId: cart.id, codes: [discountCode] },
    );
    const dcart = dd.cartDiscountCodesUpdate?.cart;
    const applied = dcart?.discountCodes?.find((c) => c.code.toUpperCase() === discountCode.toUpperCase());
    if (!applied?.applicable) throw new Error('DISCOUNT_INVALID');
    const discounted = parseFloat(dcart.cost.totalAmount.amount);
    discount = { code: discountCode, amountOff: +(total - discounted).toFixed(2) };
    total = discounted;
  }
  return { total, discount, cartLines: cart.lines.edges.map((e) => e.node) };
}

const ORDER_BY_TAG_QUERY = /* GraphQL */ `
  query OrderByTag($q: String!) {
    orders(first: 1, query: $q) { edges { node { id name } } }
  }
`;

export async function findOrderByRzpId(razorpayOrderId) {
  const d = await adminQuery(ORDER_BY_TAG_QUERY, { q: `tag:'rzp_${razorpayOrderId}'` });
  const node = d.orders?.edges?.[0]?.node;
  return node ? { orderId: node.id, orderNumber: node.name } : null;
}

export async function createPaidOrder({ payload, razorpayOrderId, razorpayPaymentId, totalRupees, discount }) {
  const input = {
    lineItems: payload.lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
    email: payload.email,
    shippingAddress: {
      firstName: payload.address.firstName,
      lastName: payload.address.lastName,
      address1: payload.address.address1,
      address2: payload.address.address2 || null,
      city: payload.address.city,
      provinceCode: payload.address.provinceCode,
      zip: payload.address.zip,
      countryCode: 'IN',
      phone: payload.address.phone,
    },
    tags: [`rzp_${razorpayOrderId}`],
    note: `Razorpay payment: ${razorpayPaymentId}${discount ? ` | code ${discount.code} (-₹${discount.amountOff})` : ''}`,
    transactions: [{ kind: 'SALE', status: 'SUCCESS', gateway: 'Razorpay',
      amountSet: { shopMoney: { amount: String(totalRupees), currencyCode: 'INR' } } }],
  };
  if (discount) {
    input.discountCode = {
      itemFixedDiscountCode: { code: discount.code,
        amountSet: { shopMoney: { amount: String(discount.amountOff), currencyCode: 'INR' } } },
    };
  }
  const d = await adminQuery(
    /* GraphQL */ `
      mutation CreateOrder($order: OrderCreateOrderInput!, $options: OrderCreateOptionsInput) {
        orderCreate(order: $order, options: $options) {
          order { id name }
          userErrors { field message }
        }
      }
    `,
    { order: input, options: { inventoryBehaviour: 'DECREMENT_OBEYING_POLICY', sendReceipt: true } },
  );
  const order = d.orderCreate?.order;
  if (!order) throw new Error(`orderCreate failed: ${JSON.stringify(d.orderCreate?.userErrors)}`);
  return { orderId: order.id, orderNumber: order.name };
}
```

**Implementer note:** the exact `orderCreate` input shape (esp. discount field
name) MUST be validated against the live 2024-10 Admin schema via an
introspection query in Task 6 before first real call — adjust field names to
match schema, keeping semantics (order tagged, paid transaction, custom discount
amount, inventory decrement, receipt email).

- [ ] **Step 4: `netlify/functions/lib/payload.js`**

```js
// Shared checkout payload validation + Razorpay-notes encode/decode.
// Notes constraints: ≤15 keys, ≤512 chars per value.

const REQUIRED_ADDRESS = ['firstName', 'lastName', 'address1', 'city', 'provinceCode', 'zip', 'phone'];

export function validatePayload(body) {
  const { lines, email, address, discountCode } = body ?? {};
  if (!Array.isArray(lines) || lines.length === 0 || lines.length > 50) return null;
  for (const l of lines) {
    if (typeof l.variantId !== 'string' || !l.variantId.startsWith('gid://shopify/ProductVariant/')) return null;
    if (!Number.isInteger(l.quantity) || l.quantity < 1 || l.quantity > 99) return null;
  }
  if (typeof email !== 'string' || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return null;
  if (!address || REQUIRED_ADDRESS.some((k) => typeof address[k] !== 'string' || !address[k].trim())) return null;
  return {
    lines: lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
    email: email.trim(),
    address: {
      firstName: address.firstName.trim(), lastName: address.lastName.trim(),
      address1: address.address1.trim(), address2: (address.address2 || '').trim(),
      city: address.city.trim(), provinceCode: address.provinceCode.trim(),
      zip: address.zip.trim(), phone: address.phone.trim(),
    },
    discountCode: typeof discountCode === 'string' && discountCode.trim() ? discountCode.trim() : null,
  };
}

// Compact: lines as "numericId:qty,numericId:qty"
export function encodeNotes(payload) {
  const items = payload.lines
    .map((l) => `${l.variantId.split('/').pop()}:${l.quantity}`)
    .join(',');
  const addr = JSON.stringify(payload.address);
  const notes = {
    items,
    email: payload.email,
    addr1: addr.slice(0, 500),
    addr2: addr.slice(500, 1000),
    code: payload.discountCode || '',
  };
  if (items.length > 500 || addr.length > 1000) return { recovery: 'partial', email: payload.email };
  return notes;
}

export function decodeNotes(notes) {
  if (!notes || notes.recovery === 'partial' || !notes.items) return null;
  const lines = notes.items.split(',').map((pair) => {
    const [id, qty] = pair.split(':');
    return { variantId: `gid://shopify/ProductVariant/${id}`, quantity: parseInt(qty, 10) };
  });
  const address = JSON.parse((notes.addr1 || '') + (notes.addr2 || ''));
  return { lines, email: notes.email, address, discountCode: notes.code || null };
}
```

- [ ] **Step 5: `.env.example`**

```
# Frontend (safe to expose — public storefront token)
VITE_SHOPIFY_STOREFRONT_TOKEN=

# Netlify Functions only — NEVER exposed to the browser
SHOPIFY_SHOP_DOMAIN=luxerio-62.myshopify.com
SHOPIFY_STOREFRONT_TOKEN=
SHOPIFY_ADMIN_TOKEN=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
```

- [ ] **Step 6: Verify + commit**

Run: `node --input-type=module -e "import('./netlify/functions/lib/payload.js').then(m => { const p = m.validatePayload({lines:[{variantId:'gid://shopify/ProductVariant/123',quantity:2}],email:'a@b.co',address:{firstName:'A',lastName:'B',address1:'X',city:'Y',provinceCode:'DL',zip:'110001',phone:'9999999999'}}); const n = m.encodeNotes(p); const back = m.decodeNotes(n); console.log(JSON.stringify(back) === JSON.stringify({lines:p.lines,email:p.email,address:p.address,discountCode:p.discountCode}) ? 'ROUNDTRIP OK' : 'MISMATCH'); })"`
Expected: `ROUNDTRIP OK`

```bash
git add netlify.toml netlify .env.example
git commit -m "feat(checkout): netlify scaffolding + shared payment/shopify libs"
```

---

### Task 2: `create-payment` function

**Files:** Create `netlify/functions/create-payment.js`

- [ ] **Step 1: Implement**

```js
import { validatePayload, encodeNotes } from './lib/payload.js';
import { priceCart } from './lib/shopify.js';
import { createRazorpayOrder } from './lib/razorpay.js';

const json = (status, body) => ({
  statusCode: status,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export async function handler(event) {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  let payload;
  try {
    payload = validatePayload(JSON.parse(event.body));
  } catch {
    payload = null;
  }
  if (!payload) return json(400, { error: 'Invalid checkout payload' });

  try {
    const { total, discount } = await priceCart(payload.lines, payload.discountCode);
    const amountPaise = Math.round(total * 100);
    if (!Number.isInteger(amountPaise) || amountPaise < 100) {
      return json(400, { error: 'Invalid order total' });
    }
    const rzpOrder = await createRazorpayOrder({
      amountPaise,
      receipt: `vancito_${Date.now()}`,
      notes: encodeNotes(payload),
    });
    return json(200, {
      razorpayOrderId: rzpOrder.id,
      amountPaise,
      currency: 'INR',
      keyId: process.env.RAZORPAY_KEY_ID,
      discount,
    });
  } catch (err) {
    if (err.message === 'DISCOUNT_INVALID') return json(400, { error: 'Discount code invalid or not applicable' });
    console.error('[create-payment]', err);
    return json(502, { error: 'Could not initialize payment' });
  }
}
```

- [ ] **Step 2: Verify locally (no keys yet: payload-validation paths only)**

`netlify dev` then:
`curl -s -X POST localhost:8888/.netlify/functions/create-payment -d '{}'` → 400 Invalid checkout payload.
`curl -s -X POST ... -d '<valid payload>'` → 502 (no keys configured) — confirms code path reaches pricing. Full happy path deferred to Task 6.

- [ ] **Step 3: Commit**

```bash
git add netlify/functions/create-payment.js
git commit -m "feat(checkout): create-payment function — server-priced Razorpay order"
```

---

### Task 3: `confirm-order` + `razorpay-webhook` functions

**Files:** Create `netlify/functions/confirm-order.js`, `netlify/functions/razorpay-webhook.js`

- [ ] **Step 1: `confirm-order.js`**

```js
import { validatePayload } from './lib/payload.js';
import { verifyPaymentSignature } from './lib/razorpay.js';
import { findOrderByRzpId, createPaidOrder, priceCart } from './lib/shopify.js';

const json = (status, body) => ({
  statusCode: status,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export async function handler(event) {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  let body;
  try { body = JSON.parse(event.body); } catch { return json(400, { error: 'Bad request' }); }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body ?? {};
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return json(400, { error: 'Missing payment fields' });
  }
  if (!verifyPaymentSignature({
    orderId: razorpay_order_id, paymentId: razorpay_payment_id, signature: razorpay_signature,
  })) {
    return json(400, { error: 'Payment verification failed' });
  }

  const payload = validatePayload(body.checkout);
  if (!payload) return json(400, { error: 'Invalid checkout payload' });

  try {
    // Idempotency: never create twice for the same Razorpay order.
    const existing = await findOrderByRzpId(razorpay_order_id);
    if (existing) return json(200, existing);

    // Re-price server-side; the charged amount and order total must agree.
    const { total, discount } = await priceCart(payload.lines, payload.discountCode);
    const order = await createPaidOrder({
      payload,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      totalRupees: total,
      discount,
    });
    return json(200, order);
  } catch (err) {
    console.error('[confirm-order]', razorpay_order_id, err);
    // Payment is real (signature verified) — client shows "payment received,
    // confirming"; webhook will finish the job.
    return json(502, { error: 'ORDER_PENDING', razorpayOrderId: razorpay_order_id });
  }
}
```

- [ ] **Step 2: `razorpay-webhook.js`**

```js
import { verifyWebhookSignature } from './lib/razorpay.js';
import { fetchRazorpayOrder } from './lib/razorpay.js';
import { decodeNotes } from './lib/payload.js';
import { findOrderByRzpId, createPaidOrder, priceCart } from './lib/shopify.js';

const json = (status, body) => ({ statusCode: status, body: JSON.stringify(body) });

export async function handler(event) {
  if (event.httpMethod !== 'POST') return json(405, {});
  const signature = event.headers['x-razorpay-signature'];
  if (!signature || !verifyWebhookSignature(event.body, signature)) {
    return json(400, { error: 'Bad signature' });
  }

  const evt = JSON.parse(event.body);
  if (evt.event !== 'payment.captured') return json(200, { skipped: evt.event });

  const payment = evt.payload?.payment?.entity;
  const rzpOrderId = payment?.order_id;
  if (!rzpOrderId) return json(200, { skipped: 'no order id' });

  try {
    const existing = await findOrderByRzpId(rzpOrderId);
    if (existing) return json(200, { ok: true, already: existing.orderNumber });

    const rzpOrder = await fetchRazorpayOrder(rzpOrderId);
    const payload = decodeNotes(rzpOrder.notes);
    if (!payload) {
      console.error('[webhook] UNRECOVERABLE notes for', rzpOrderId, '— manual reconciliation needed');
      return json(200, { ok: false, manual: true });
    }
    const { total, discount } = await priceCart(payload.lines, payload.discountCode);
    const order = await createPaidOrder({
      payload, razorpayOrderId: rzpOrderId, razorpayPaymentId: payment.id,
      totalRupees: total, discount,
    });
    return json(200, { ok: true, order: order.orderNumber });
  } catch (err) {
    console.error('[webhook]', rzpOrderId, err);
    return json(500, { error: 'retry' }); // non-2xx → Razorpay retries
  }
}
```

- [ ] **Step 3: Verify locally**

`curl -X POST localhost:8888/.netlify/functions/confirm-order -d '{"razorpay_order_id":"x","razorpay_payment_id":"y","razorpay_signature":"deadbeef"}'` → 400 Payment verification failed (with any RAZORPAY_KEY_SECRET set in `.env`).
Webhook: POST without signature header → 400.

- [ ] **Step 4: Commit**

```bash
git add netlify/functions/confirm-order.js netlify/functions/razorpay-webhook.js
git commit -m "feat(checkout): confirm-order + webhook — verified idempotent order creation"
```

---

### Task 4: Checkout session state + entry-point swaps

**Files:** Create `src/lib/checkout/session.js`; Modify `src/context/CartContext.jsx`, `src/pages/Product.jsx`

- [ ] **Step 1: `src/lib/checkout/session.js`**

```js
/*
  Checkout session — which lines are being purchased and where they came from.
  sessionStorage-backed so /checkout survives a refresh.
  source: 'cart' (clear bag after confirmed order) | 'buy-now' (bag untouched).
*/
const KEY = 'vancito-checkout';

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
```

Line shape: `{ variantId, quantity, title, variant, price, image }` (display fields
for the summary; server ignores everything but variantId+quantity).

- [ ] **Step 2: `CartContext.jsx` — initiateCheckout**

Replace the `checkoutUrl` redirect body with:

```js
const initiateCheckout = useCallback(() => {
  trackEvent(EVENTS.BEGIN_CHECKOUT, {
    value: cost?.total,
    currency: cost?.currencyCode,
    items: lines.map((l, i) => ({ item_id: l.merchandiseId, item_name: l.title, index: i, price: l.price })),
  });
  startCheckout({
    lines: lines.map((l) => ({
      variantId: l.merchandiseId, quantity: l.qty,
      title: l.title, variant: l.variant, price: l.price, image: l.image,
    })),
    source: 'cart',
  });
  window.location.assign('/checkout');
}, [cost, lines]);
```

(`window.location.assign` because CartContext sits outside the router — the SPA
reloads onto /checkout via the Netlify SPA redirect; sessionStorage carries state.
Import `startCheckout`. Also export the bag-clearing function via context if not
already exposed — OrderConfirmed needs to empty the bag for cart-source orders:
add a `clearBag` that removes the cart id + resets lines locally.)

- [ ] **Step 3: `Product.jsx` — handleBuyNow**

Replace the standalone cartCreate+redirect body with:

```js
const handleBuyNow = () => {
  if (!selected || !product) return;
  trackEvent(EVENTS.BEGIN_CHECKOUT, {
    value: parseFloat(selected.price?.amount ?? 0),
    currency: selected.price?.currencyCode,
    items: [{ item_id: selected.id, item_name: product.title, price: parseFloat(selected.price?.amount ?? 0) }],
  });
  startCheckout({
    lines: [{
      variantId: selected.id, quantity: 1,
      title: product.title, variant: selected.title,
      price: parseFloat(selected.price?.amount ?? 0), image: images[0]?.url,
    }],
    source: 'buy-now',
  });
  navigate('/checkout');
};
```

Remove now-unused `storefrontQuery`/`CART_CREATE` imports and `buying`/`buyError`
state from Product.jsx (loading/error handling moves to the Checkout page). Add
`useNavigate`. Buy Now button simplifies to `disabled={soldOut || !selected}`.
Also replace the trust line `Free expedited shipping on orders over $100` →
`Free shipping across India`.

- [ ] **Step 4: Verify in browser**

Buy Now on a product → lands on `/checkout` (404-ish placeholder until Task 5 —
verify sessionStorage `vancito-checkout` holds the line). Cart page → INITIATE
CHECKOUT → same for bag lines with `source: 'cart'`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/checkout/session.js src/context/CartContext.jsx src/pages/Product.jsx
git commit -m "feat(checkout): route both entry points to in-app /checkout"
```

---

### Task 5: Checkout + OrderConfirmed pages

**Files:** Create `src/pages/Checkout.jsx`, `src/pages/OrderConfirmed.jsx`; Modify `src/App.jsx`

- [ ] **Step 1: `Checkout.jsx`** — pronk-styled, token classes throughout.

Structure (full component, ~250 lines; key logic):

```jsx
// state: form fields (email, firstName, lastName, address1, address2, city,
// provinceCode, zip, phone), discountCode, discount result, paying, payError
// on mount: session = readCheckout(); if (!session) navigate('/cart')
// prefill email/name from useCustomer() customer when present

const INDIAN_STATES = [ /* code+label list: AN..WB — full 36 entries */ ];

async function handlePay(e) {
  e.preventDefault();
  setPaying(true); setPayError(null);
  try {
    const checkoutPayload = {
      lines: session.lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
      email: form.email,
      address: { ...form },           // firstName..phone
      discountCode: appliedCode || null,
    };
    const res = await fetch('/.netlify/functions/create-payment', {
      method: 'POST', body: JSON.stringify(checkoutPayload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not start payment');

    await loadRazorpayScript(); // inject https://checkout.razorpay.com/v1/checkout.js once
    const rzp = new window.Razorpay({
      key: data.keyId,
      order_id: data.razorpayOrderId,
      amount: data.amountPaise,
      currency: 'INR',
      name: 'Vancito.co',
      prefill: { name: `${form.firstName} ${form.lastName}`, email: form.email, contact: form.phone },
      theme: { color: '#111111' },
      modal: { ondismiss: () => setPaying(false) },
      handler: async (rsp) => {
        const confirmRes = await fetch('/.netlify/functions/confirm-order', {
          method: 'POST',
          body: JSON.stringify({ ...rsp, checkout: checkoutPayload }),
        });
        const confirm = await confirmRes.json();
        if (confirmRes.ok) {
          navigate(`/order-confirmed?n=${encodeURIComponent(confirm.orderNumber)}&src=${session.source}`);
        } else if (confirm.error === 'ORDER_PENDING') {
          navigate(`/order-confirmed?pending=1&src=${session.source}`);
        } else {
          setPayError('Payment verification failed. If you were charged, contact support with your payment reference.');
          setPaying(false);
        }
      },
    });
    rzp.on('payment.failed', () => { setPayError('Payment failed. You have not been charged — try again.'); setPaying(false); });
    rzp.open();
  } catch (err) {
    setPayError(err.message); setPaying(false);
  }
}
```

Discount UX: APPLY button calls `create-payment`? No — cheap client validation
round-trip is wasteful; instead the code is applied at PAY time and errors
surface pre-modal (`Discount code invalid...`). Keep a simple code input +
"applied at payment" helper text. (Keeps one server path for pricing — no drift.)

Summary column: session lines (image, title, variant, qty, line total), subtotal,
`Shipping — Free`, total; discount shown post-create-payment response when
applied.

- [ ] **Step 2: `OrderConfirmed.jsx`**

```jsx
// reads ?n= (order number) | ?pending=1, and ?src=
// on mount: clearCheckout(); if (src === 'cart') clearBag();
// pending → "Payment received — your order is being confirmed. You'll get the
//   confirmation email shortly." ; else "Order <n> confirmed" + email note
// CONTINUE SHOPPING → /shop
```

- [ ] **Step 3: Routes in `App.jsx`**

```jsx
<Route path="/checkout" element={<Checkout />} />
<Route path="/order-confirmed" element={<OrderConfirmed />} />
```

- [ ] **Step 4: Verify in browser (no keys)**

/checkout renders form + summary from session for both entry paths; empty
session redirects to /cart; PAY with unreachable function shows inline error;
form validation blocks empty required fields. Both themes, mobile + desktop.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Checkout.jsx src/pages/OrderConfirmed.jsx src/App.jsx
git commit -m "feat(checkout): in-app checkout + order-confirmed pages with Razorpay modal"
```

---

### Task 6: Keyed E2E verification (BLOCKED on user prerequisites)

**Needs:** Razorpay test keys, Shopify Admin token, Netlify site (or `netlify dev` with `.env`), webhook secret after registering `<site>/.netlify/functions/razorpay-webhook` for `payment.captured`.

- [ ] **Step 1:** Introspect live Admin schema for `orderCreate` input shape; fix `lib/shopify.js` field names if they differ from plan assumptions. 
- [ ] **Step 2:** Full Buy Now purchase with Razorpay test card/UPI → assert: lands on /order-confirmed with order number; order in Shopify admin: paid, tagged `rzp_*`, inventory decremented, receipt email queued; Razorpay payment id in order note.
- [ ] **Step 3:** Cart-path purchase (2+ items) → same asserts + bag cleared after confirmation, not before.
- [ ] **Step 4:** Discount code purchase → Shopify-computed discounted total charged; invalid code blocked before modal.
- [ ] **Step 5:** Idempotency: replay confirm-order with same payload → same order number, no duplicate.
- [ ] **Step 6:** Webhook: pay, kill tab before confirm fires (or block the confirm call), wait for webhook → order exists anyway.
- [ ] **Step 7:** `npm run build` → grep `dist/` for `RAZORPAY_KEY_SECRET`/`SHOPIFY_ADMIN_TOKEN` → zero hits.
- [ ] **Step 8:** Commit fixes; final commit `feat(checkout): live-verified custom checkout E2E`.

---

## Self-Review (done at write time)

- **Spec coverage:** all three functions (spec §Backend) → Tasks 1–3; /checkout + /order-confirmed + entry swaps + trust copy (spec §Frontend) → Tasks 4–5; failure-mode table → signature checks (T3), idempotency (T3), webhook recovery (T3), ORDER_PENDING UX (T5); success criteria → Task 6.
- **Placeholders:** INDIAN_STATES marked as full-list requirement (data, not logic); orderCreate schema validation is an explicit Task 6 step, not an unstated assumption.
- **Type consistency:** payload shape `{ lines, email, address, discountCode }` identical across payload.js / create-payment / confirm-order / Checkout.jsx; notes encode/decode round-trip tested in Task 1 Step 6; `priceCart` return `{ total, discount, cartLines }` used consistently.
