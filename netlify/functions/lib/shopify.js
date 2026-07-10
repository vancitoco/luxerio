const SHOP_DOMAIN = process.env.SHOPIFY_SHOP_DOMAIN || 'luxerio-62.myshopify.com';
const API_VERSION = '2024-10';

// The Admin API client-credentials grant issues short-lived tokens (~24h), not
// a permanent static token — so we fetch and cache one in memory (per warm
// function container) instead of trusting a fixed env var to stay valid.
let _adminTokenCache = null; // { token, expiresAt }

async function getAdminToken() {
  const now = Date.now();
  if (_adminTokenCache && _adminTokenCache.expiresAt - now > 60_000) {
    return _adminTokenCache.token;
  }
  const res = await fetch(`https://${SHOP_DOMAIN}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.SHOPIFY_ADMIN_CLIENT_ID,
      client_secret: process.env.SHOPIFY_ADMIN_CLIENT_SECRET,
      grant_type: 'client_credentials',
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`Admin token fetch failed: ${JSON.stringify(data)}`);
  _adminTokenCache = { token: data.access_token, expiresAt: now + data.expires_in * 1000 };
  return _adminTokenCache.token;
}

// Parses a Shopify decimal amount string (e.g. "1234.50") into integer paise
// without floating-point rounding error — string-split, not parseFloat.
function toPaise(amountStr) {
  const [whole, frac = ''] = String(amountStr).split('.');
  const paddedFrac = (frac + '00').slice(0, 2);
  const sign = whole.trim().startsWith('-') ? -1 : 1;
  return sign * (Math.abs(parseInt(whole, 10)) * 100 + parseInt(paddedFrac, 10));
}

async function adminQuery(query, variables) {
  const token = await getAdminToken();
  const res = await fetch(`https://${SHOP_DOMAIN}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': token,
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
      // Server-side calls use the PRIVATE Storefront token, which Shopify
      // authenticates via a different header than the public/client token —
      // Shopify-Storefront-Private-Token, not X-Shopify-Storefront-Access-Token.
      'Shopify-Storefront-Private-Token': process.env.SHOPIFY_STOREFRONT_TOKEN,
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
  // Line count can legitimately be lower than requested if the client sent the
  // same variantId twice (Shopify merges duplicate lines into one) — compare
  // total requested quantity per variant instead of raw edge count, so a
  // legitimate merge isn't mistaken for an invalid/unavailable variant.
  const requestedQtyByVariant = new Map();
  for (const l of lines) {
    requestedQtyByVariant.set(l.variantId, (requestedQtyByVariant.get(l.variantId) ?? 0) + l.quantity);
  }
  const cartQtyByVariant = new Map();
  for (const e of cart.lines.edges) {
    cartQtyByVariant.set(e.node.merchandise.id, e.node.quantity);
  }
  const quantitiesMatch =
    requestedQtyByVariant.size === cartQtyByVariant.size &&
    [...requestedQtyByVariant].every(([id, qty]) => cartQtyByVariant.get(id) === qty);
  if (!quantitiesMatch) throw new Error('One or more items are unavailable.');

  // All money math below happens in integer paise — no float drift between the
  // subtotal and discounted total, however Shopify formats the decimal strings.
  let totalPaise = toPaise(cart.cost.totalAmount.amount);
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
    const discountedPaise = toPaise(dcart.cost.totalAmount.amount);
    discount = { code: discountCode, amountOff: (totalPaise - discountedPaise) / 100 };
    totalPaise = discountedPaise;
  }
  // Convert back to a rupee number once, at the boundary — paise is always an
  // integer here so this division is exact for real-world currency magnitudes,
  // and callers immediately round (Math.round(total * 100)) to get paise back.
  return { total: totalPaise / 100, discount, cartLines: cart.lines.edges.map((e) => e.node) };
}

const ORDER_BY_TAG_QUERY = /* GraphQL */ `
  query OrderByTag($q: String!) {
    orders(first: 1, query: $q) { edges { node { id name } } }
  }
`;

// Razorpay order ids are always "order_" + alphanumerics. Asserting the shape
// before it's interpolated into Shopify's search-syntax string keeps a stray
// character from ever breaking (or being used to manipulate) the search query —
// this function's entire purpose is idempotency-critical order lookup.
const RAZORPAY_ORDER_ID_RE = /^order_[A-Za-z0-9]+$/;

export async function findOrderByRzpId(razorpayOrderId) {
  if (!RAZORPAY_ORDER_ID_RE.test(razorpayOrderId)) {
    throw new Error(`Invalid Razorpay order id shape: ${razorpayOrderId}`);
  }
  const d = await adminQuery(ORDER_BY_TAG_QUERY, { q: `tag:'rzp_${razorpayOrderId}'` });
  const node = d.orders?.edges?.[0]?.node;
  return node ? { orderId: node.id, orderNumber: node.name } : null;
}

// Verified live against the 2024-10 Admin API schema via introspection (Task 2,
// Step 1) — every field name below (variantId/quantity, provinceCode,
// itemFixedDiscountCode.code/amountSet, transaction kind/status enums, IN/INR
// enum values, PARTIALLY_PAID financialStatus) matches OrderCreateOrderInput and
// its nested input types exactly.
export async function createPaidOrder({ payload, razorpayOrderId, razorpayPaymentId, totalRupees, chargedRupees, discount, codBalance = 0 }) {
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
    tags: codBalance > 0 ? [`rzp_${razorpayOrderId}`, 'COD'] : [`rzp_${razorpayOrderId}`],
    note: [
      `Razorpay payment: ${razorpayPaymentId}`,
      discount ? `code ${discount.code} (-₹${discount.amountOff})` : null,
      codBalance > 0 ? `Balance due on delivery: ₹${codBalance}` : null,
    ].filter(Boolean).join(' | '),
    // PARTIALLY_PAID for COD orders — Shopify derives "partially paid" from
    // order total vs. transaction total, this makes it explicit. Verified
    // against the live 2024-10 schema (Task 2, Step 1) same as PAID was.
    financialStatus: codBalance > 0 ? 'PARTIALLY_PAID' : 'PAID',
    transactions: [{ kind: 'SALE', status: 'SUCCESS', gateway: 'Razorpay',
      // The transaction reflects what was ACTUALLY charged, not the order
      // total — for a COD order that's the advance, not the full amount.
      amountSet: { shopMoney: { amount: String(chargedRupees), currencyCode: 'INR' } } }],
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
