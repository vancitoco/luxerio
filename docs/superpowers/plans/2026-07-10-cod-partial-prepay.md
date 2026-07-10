# Cash on Delivery with Partial Prepayment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a customer pay a small tiered advance (₹200 under ₹1000, ₹300 at/above ₹1000) via Razorpay and owe the rest as cash on delivery, with Shopify orders correctly reflecting "Partially paid" status and the balance due.

**Architecture:** The tier is computed once, server-side, in `create-payment`, and baked into the Razorpay order amount. Every later step (`confirm-order`, `razorpay-webhook`) derives the balance from what Razorpay actually charged — never by recomputing the tier — so a delayed webhook retry or a price change between charge and confirmation can't produce a wrong balance. See `docs/superpowers/specs/2026-07-10-cod-partial-prepay-design.md` for full rationale.

**Tech Stack:** React (Vite), Netlify Functions (Node), Shopify Admin/Storefront GraphQL APIs, Razorpay Orders API. No test framework exists in this repo — verification uses live curl against Shopify/Razorpay APIs and browser-driven checks, matching how every other backend function here was verified.

---

## File Structure

| File | Responsibility |
|---|---|
| `netlify/functions/lib/payload.js` | Validate/pass through `paymentMethod`; encode/decode it in Razorpay order notes |
| `netlify/functions/lib/shopify.js` | `createPaidOrder` gains COD balance/tag/note/financial-status logic |
| `netlify/functions/create-payment.js` | Computes the tier, charges the advance instead of the full total for COD |
| `netlify/functions/confirm-order.js` | Derives balance from the actually-charged Razorpay amount, passes to `createPaidOrder` |
| `netlify/functions/razorpay-webhook.js` | Same derivation, using the amount already present in the webhook event |
| `src/pages/Checkout.jsx` | Payment-method toggle, advance/balance display, re-renders from server response |
| `src/pages/OrderConfirmed.jsx` | Shows "Balance due on delivery" for COD orders |
| `src/pages/legal/RefundPolicy.jsx` | One added sentence: COD advance is non-refundable on refused/undelivered orders (needs your sign-off on wording — flagged as its own task, not bundled silently) |

---

### Task 1: `lib/payload.js` — validate and encode `paymentMethod`

**Files:**
- Modify: `netlify/functions/lib/payload.js`

- [ ] **Step 1: Add `paymentMethod` validation to `validatePayload`**

Replace the function body (lines 11–38) with:

```js
export function validatePayload(body) {
  const { lines, email, address, discountCode, paymentMethod } = body ?? {};
  if (!Array.isArray(lines) || lines.length === 0 || lines.length > 50) return null;
  const seenVariants = new Set();
  for (const l of lines) {
    if (typeof l.variantId !== 'string' || !l.variantId.startsWith('gid://shopify/ProductVariant/')) return null;
    if (!Number.isInteger(l.quantity) || l.quantity < 1 || l.quantity > 99) return null;
    // Reject duplicate variant lines rather than relying on downstream merge
    // behavior — forces the client to send one line per variant with a summed
    // quantity, which is what the rest of this pipeline assumes.
    if (seenVariants.has(l.variantId)) return null;
    seenVariants.add(l.variantId);
  }
  if (typeof email !== 'string' || email.length > MAX_EMAIL_LEN || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return null;
  if (!address || REQUIRED_ADDRESS.some((k) => typeof address[k] !== 'string' || !address[k].trim())) return null;
  if (typeof discountCode === 'string' && discountCode.length > MAX_DISCOUNT_CODE_LEN) return null;
  // Absent means the pre-COD client shape — treat as full prepay. Any other
  // value must be exactly 'full' or 'cod'; never silently default an
  // unrecognized value to 'full' and charge more than the client asked for.
  const method = paymentMethod === undefined ? 'full' : paymentMethod;
  if (method !== 'full' && method !== 'cod') return null;
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
    paymentMethod: method,
  };
}
```

- [ ] **Step 2: Add the `m` key to `encodeNotes` and recover it in `decodeNotes`**

Replace `encodeNotes` and `decodeNotes` (the rest of the file) with:

```js
// Compact: lines as "numericId:qty,numericId:qty"
export function encodeNotes(payload) {
  const items = payload.lines
    .map((l) => `${l.variantId.split('/').pop()}:${l.quantity}`)
    .join(',');
  const addr = JSON.stringify(payload.address);
  const notes = {
    items,
    // Defensive slicing even though validatePayload already caps these — this
    // function has one job (stay inside Razorpay's ≤512-chars-per-value limit)
    // and shouldn't rely on every caller having validated first.
    email: (payload.email || '').slice(0, 254),
    addr1: addr.slice(0, 500),
    addr2: addr.slice(500, 1000),
    code: (payload.discountCode || '').slice(0, 255),
    // Single-char so it never threatens the notes size limit. 'c' = cod,
    // 'f' = full. The webhook fallback path needs this to know whether an
    // order it's recovering was ever meant to be a partial charge.
    m: payload.paymentMethod === 'cod' ? 'c' : 'f',
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
  return {
    lines,
    email: notes.email,
    address,
    discountCode: notes.code || null,
    // Orders created before this feature shipped have no 'm' key — treat
    // as full prepay, which is what they always were.
    paymentMethod: notes.m === 'c' ? 'cod' : 'full',
  };
}
```

- [ ] **Step 3: Verify with a local Node sanity check**

Run:

```bash
node --input-type=module -e "
import { validatePayload, encodeNotes, decodeNotes } from './netlify/functions/lib/payload.js';

const base = {
  lines: [{ variantId: 'gid://shopify/ProductVariant/123', quantity: 1 }],
  email: 'a@b.com',
  address: { firstName: 'A', lastName: 'B', address1: 'X', city: 'Y', provinceCode: 'MH', zip: '400001', phone: '9999999999' },
};

console.log('no paymentMethod ->', validatePayload(base)?.paymentMethod); // expect 'full'
console.log('cod ->', validatePayload({ ...base, paymentMethod: 'cod' })?.paymentMethod); // expect 'cod'
console.log('bogus ->', validatePayload({ ...base, paymentMethod: 'bogus' })); // expect null

const p = validatePayload({ ...base, paymentMethod: 'cod' });
const notes = encodeNotes(p);
console.log('encoded m ->', notes.m); // expect 'c'
console.log('roundtrip ->', decodeNotes(notes).paymentMethod); // expect 'cod'
"
```

Expected output:
```
no paymentMethod -> full
cod -> cod
bogus -> null
encoded m -> c
roundtrip -> cod
```

- [ ] **Step 4: Commit**

```bash
git add netlify/functions/lib/payload.js
git commit -m "feat(cod): validate and encode paymentMethod through payload/notes"
```

---

### Task 2: `lib/shopify.js` — `createPaidOrder` COD support

**Files:**
- Modify: `netlify/functions/lib/shopify.js:135-178`

- [ ] **Step 1: Verify `PARTIALLY_PAID` is a valid `OrderCreateFinancialStatus` value**

The existing code comment at line 131 notes `'PAID'` was confirmed via live schema introspection. Do the same check for `PARTIALLY_PAID` before using it — run (fill in your Admin token/domain from `.env`):

```bash
node --input-type=module -e "
const res = await fetch('https://vancito-co-2.myshopify.com/admin/api/2024-10/graphql.json', {
  method: 'POST',
  headers: { 'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_TOKEN, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: '{ __type(name: \"OrderCreateFinancialStatus\") { enumValues { name } } }' }),
});
console.log(JSON.stringify(await res.json(), null, 2));
" 
```

(If `SHOPIFY_ADMIN_TOKEN` isn't set as a plain env var locally, fetch a fresh one first via the client-credentials curl command from earlier in this project's setup, or temporarily hardcode it in the script for this one-off check — never commit a hardcoded token.)

Expected: the enum list includes `PARTIALLY_PAID`. If it doesn't, stop and re-check the actual name (e.g., it might be `PARTIALLY_PAID` vs `PARTIAL_PAID`) before writing Step 2.

- [ ] **Step 2: Add `codBalance` and `chargedRupees` to `createPaidOrder`**

Replace the function (lines 135–178) with:

```js
export async function createPaidOrder({ payload, razorpayOrderId, razorpayPaymentId, chargedRupees, discount, codBalance = 0 }) {
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
```

Note: `totalRupees` is dropped from the signature entirely — the original function used it for the transaction amount, but that's now `chargedRupees`, so keeping `totalRupees` around would be a newly-dead parameter. (Caught during Task 2's code review, corrected in commit `7dd3ee5`.) Callers do not need to pass it.

- [ ] **Step 3: Commit**

```bash
git add netlify/functions/lib/shopify.js
git commit -m "feat(cod): createPaidOrder supports partial-paid COD orders"
```

---

### Task 3: `create-payment.js` — compute tier, charge the advance

**Files:**
- Modify: `netlify/functions/create-payment.js`

- [ ] **Step 1: Add the tier constants and computation**

At the top of the file, after the existing imports, add:

```js
const COD_TIER_THRESHOLD_RUPEES = 1000;
const COD_ADVANCE_BELOW_THRESHOLD = 200;
const COD_ADVANCE_AT_OR_ABOVE_THRESHOLD = 300;

function codAdvanceRupees(totalRupees) {
  return totalRupees < COD_TIER_THRESHOLD_RUPEES
    ? COD_ADVANCE_BELOW_THRESHOLD
    : COD_ADVANCE_AT_OR_ABOVE_THRESHOLD;
}
```

- [ ] **Step 2: Charge the advance instead of the full total for COD, return the balance**

Replace the `try` block inside `handler` (lines 33–56) with:

```js
  try {
    const { total, discount } = await priceCart(payload.lines, payload.discountCode);
    const isCod = payload.paymentMethod === 'cod';
    const chargeRupees = isCod ? codAdvanceRupees(total) : total;
    // A discount can drop the total below the tier advance (e.g. a ₹200
    // cart with a ₹100-off coupon still charges a ₹200 advance) — clamp so
    // the balance never goes negative. Caught in Task 3's code review,
    // corrected in commit 8440234.
    const codBalance = isCod ? Math.max(0, total - chargeRupees) : 0;
    const amountPaise = Math.round(chargeRupees * 100);
    if (!Number.isInteger(amountPaise) || amountPaise < 100) {
      return json(400, { error: 'Invalid order total' });
    }
    const rzpOrder = await createRazorpayOrder({
      amountPaise,
      receipt: `vancito_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      notes: encodeNotes(payload),
      idempotencyKey: readIdempotencyKey(rawBody),
    });
    return json(200, {
      razorpayOrderId: rzpOrder.id,
      amountPaise,
      currency: 'INR',
      keyId: process.env.RAZORPAY_KEY_ID,
      discount,
      codBalance,
    });
  } catch (err) {
    if (err.message === 'DISCOUNT_INVALID') return json(400, { error: 'Discount code invalid or not applicable' });
    console.error('[create-payment]', err);
    return json(502, { error: 'Could not initialize payment' });
  }
```

- [ ] **Step 3: Verify with a live curl against `netlify dev`**

Start `netlify dev` (`.claude/launch.json` config `luxerio-dev`, or `netlify dev` directly), then run — replace `VARIANT_ID` with a real variant gid from your catalog (e.g. the ₹1 "TEST" product used in earlier E2E checks):

```bash
curl -s -X POST http://localhost:8899/.netlify/functions/create-payment \
  -H "Content-Type: application/json" \
  -d '{
    "lines": [{"variantId":"VARIANT_ID","quantity":1}],
    "email": "test@example.com",
    "address": {"firstName":"T","lastName":"User","address1":"X","city":"Mumbai","provinceCode":"MH","zip":"400001","phone":"9999999999"},
    "paymentMethod": "cod"
  }'
```

Expected: `amountPaise: 20000` (₹200, since the test product is well under ₹1000) and `codBalance` equal to `total - 200`. Repeat with `"paymentMethod": "full"` and expect `amountPaise` to equal the product's full price in paise, `codBalance: 0`.

- [ ] **Step 4: Commit**

```bash
git add netlify/functions/create-payment.js
git commit -m "feat(cod): charge the tiered advance instead of the full total"
```

---

### Task 4: `confirm-order.js` — derive balance from the actual charge

**Files:**
- Modify: `netlify/functions/confirm-order.js`

- [ ] **Step 1: Fetch the charged amount and pass `codBalance`/`chargedRupees` through**

Replace the file's imports and the `try` block with:

```js
import { validatePayload } from './lib/payload.js';
import { verifyPaymentSignature } from './lib/razorpay.js';
import { fetchRazorpayOrder } from './lib/razorpay.js';
import { findOrderByRzpId, createPaidOrder, priceCart } from './lib/shopify.js';
```

(add `fetchRazorpayOrder` to the razorpay import — it already exists in `lib/razorpay.js`, just wasn't imported here before)

Then replace the `try` block:

```js
  try {
    // Idempotency: never create twice for the same Razorpay order.
    const existing = await findOrderByRzpId(razorpay_order_id);
    if (existing) return json(200, existing);

    // Re-price server-side; the charged amount and order total must agree.
    const { total, discount } = await priceCart(payload.lines, payload.discountCode);
    // The advance actually charged — never recomputed from the tier here.
    // See design doc: this is what keeps the recorded balance immune to
    // price/discount drift between the charge and this confirmation.
    const rzpOrder = await fetchRazorpayOrder(razorpay_order_id);
    const chargedRupees = rzpOrder.amount / 100;
    const codBalance = payload.paymentMethod === 'cod' ? Math.max(0, total - chargedRupees) : 0;
    const order = await createPaidOrder({
      payload,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      chargedRupees,
      discount,
      codBalance,
    });
    return json(200, { ...order, codBalance });
  } catch (err) {
    console.error('[confirm-order]', razorpay_order_id, err);
    // Payment is real (signature verified) — client shows "payment received,
    // confirming"; webhook will finish the job. This also covers the case where
    // razorpay_order_id has an unexpected shape: findOrderByRzpId throws on that,
    // and that throw is caught right here, degrading safely instead of leaking
    // an unhandled error.
    return json(502, { error: 'ORDER_PENDING', razorpayOrderId: razorpay_order_id });
  }
```

- [ ] **Step 2: Verify against a real (tiny) live payment**

This function can only be meaningfully exercised end-to-end (it needs a real signed Razorpay payment) — defer full verification to Task 7's live checkout run. For now, confirm the file has no syntax errors:

```bash
node --check netlify/functions/confirm-order.js
```

Expected: no output (exit code 0).

- [ ] **Step 3: Commit**

```bash
git add netlify/functions/confirm-order.js
git commit -m "feat(cod): confirm-order derives balance from the actual Razorpay charge"
```

---

### Task 5: `razorpay-webhook.js` — mirror the derivation using the event's own amount

**Files:**
- Modify: `netlify/functions/razorpay-webhook.js`

- [ ] **Step 1: Compute `codBalance`/`chargedRupees` from the webhook payload**

Replace the `try` block with:

```js
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
    // payment.entity.amount is what Razorpay actually captured — the same
    // "derive from the real charge, not the tier" rule as confirm-order.
    // Validated defensively: a malformed webhook lacking `amount` would
    // otherwise silently produce NaN downstream (balance, Shopify amount
    // string). Caught in Task 5's code review, added in commit ac04d6e.
    if (!Number.isFinite(payment.amount)) {
      console.error('[webhook] Missing or invalid payment.amount for', rzpOrderId);
      return json(400, { error: 'Invalid payment data' });
    }
    const chargedRupees = payment.amount / 100;
    const codBalance = payload.paymentMethod === 'cod' ? Math.max(0, total - chargedRupees) : 0;
    const order = await createPaidOrder({
      payload, razorpayOrderId: rzpOrderId, razorpayPaymentId: payment.id,
      chargedRupees, discount, codBalance,
    });
    return json(200, { ok: true, order: order.orderNumber });
  } catch (err) {
    // Includes the malformed-rzpOrderId case: findOrderByRzpId throws on a
    // shape that doesn't match /^order_[A-Za-z0-9]+$/, and that throw lands
    // here, not as an unhandled rejection. A 500 tells Razorpay to retry.
    console.error('[webhook]', rzpOrderId, err);
    return json(500, { error: 'retry' }); // non-2xx → Razorpay retries
  }
```

- [ ] **Step 2: Syntax check**

```bash
node --check netlify/functions/razorpay-webhook.js
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add netlify/functions/razorpay-webhook.js
git commit -m "feat(cod): webhook derives balance from payment.entity.amount"
```

---

### Task 6: `Checkout.jsx` — payment-method toggle and balance display

**Files:**
- Modify: `src/pages/Checkout.jsx`

- [ ] **Step 1: Add COD tier constants and a `paymentMethod` state**

After the `emptyForm` constant (line 93), add:

```js
const COD_TIER_THRESHOLD = 1000;
const COD_ADVANCE_BELOW = 200;
const COD_ADVANCE_AT_OR_ABOVE = 300;

function estimateCodAdvance(subtotal) {
  return subtotal < COD_TIER_THRESHOLD ? COD_ADVANCE_BELOW : COD_ADVANCE_AT_OR_ABOVE;
}
```

Inside the `Checkout` component, after the `payError` state (line 102), add:

```js
  const [paymentMethod, setPaymentMethod] = useState('full');
  // Set once the server responds — authoritative, overrides the client
  // estimate below (see design doc: a discount crossing the ₹1000 boundary
  // can make the real charge disagree with the client-side guess).
  const [serverAmounts, setServerAmounts] = useState(null); // { advancePaise, codBalance } | null
```

- [ ] **Step 2: Send `paymentMethod` in the checkout payload and capture the server's amounts**

In `handlePay`, change the `checkoutPayload` construction (lines 143–148) to:

```js
      const checkoutPayload = {
        lines: session.lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
        email: form.email,
        address: { ...form },
        discountCode: discountCode.trim() ? discountCode.trim().toUpperCase() : null,
        paymentMethod,
      };
```

Immediately after `if (!res.ok) throw new Error(data.error || 'Could not start payment');` (line 155), add:

```js
      setServerAmounts({ advancePaise: data.amountPaise, codBalance: data.codBalance ?? 0 });
```

- [ ] **Step 3: Pass the balance through to the confirmation page navigation**

Change the success-navigation line (line 177) from:

```js
              navigate(`/order-confirmed?n=${encodeURIComponent(confirm.orderNumber)}&src=${session.source}`);
```

to:

```js
              const balSuffix = confirm.codBalance > 0 ? `&bal=${confirm.codBalance}` : '';
              navigate(`/order-confirmed?n=${encodeURIComponent(confirm.orderNumber)}&src=${session.source}${balSuffix}`);
```

- [ ] **Step 4: Add the payment-method toggle UI**

Insert a new section right before the Discount Code section (before line 263's `{/* Discount code. */}` comment):

```jsx
          {/* Payment method. */}
          <section className="flex flex-col gap-4 border border-hairline bg-surface p-6">
            <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-primary">
              Payment Method
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => { setPaymentMethod('full'); setServerAmounts(null); }}
                className={`border px-4 py-3 text-left font-display text-xs font-semibold uppercase tracking-widest transition-colors ${
                  paymentMethod === 'full' ? 'border-acid text-primary' : 'border-hairline text-secondary hover:text-primary'
                }`}
              >
                Pay in Full
              </button>
              <button
                type="button"
                onClick={() => { setPaymentMethod('cod'); setServerAmounts(null); }}
                className={`border px-4 py-3 text-left font-display text-xs font-semibold uppercase tracking-widest transition-colors ${
                  paymentMethod === 'cod' ? 'border-acid text-primary' : 'border-hairline text-secondary hover:text-primary'
                }`}
              >
                Cash on Delivery
              </button>
            </div>
            {paymentMethod === 'cod' && (
              <p className="font-display text-[10px] uppercase tracking-widest text-secondary">
                Pay ₹{serverAmounts ? serverAmounts.advancePaise / 100 : estimateCodAdvance(subtotal)} now to confirm your order.
                The remaining balance is paid in cash on delivery.
              </p>
            )}
          </section>
```

- [ ] **Step 5: Update the order summary total display for COD**

Replace the Total block (lines 360–367) with:

```jsx
            <div className="flex items-baseline justify-between">
              <span className="font-display text-[10px] font-semibold uppercase tracking-widest text-secondary">
                {paymentMethod === 'cod' ? 'Pay Now' : 'Total'}
              </span>
              <span className="font-display text-3xl font-semibold tabular-nums text-primary">
                {paymentMethod === 'cod'
                  ? fmt((serverAmounts ? serverAmounts.advancePaise / 100 : estimateCodAdvance(subtotal)), lineCurrency)
                  : fmt(subtotal, lineCurrency)}
              </span>
            </div>
            {paymentMethod === 'cod' && (
              <div className="flex items-center justify-between">
                <span className="font-display text-[10px] font-bold uppercase tracking-widest text-secondary">
                  Balance Due on Delivery
                </span>
                <span className="font-display text-sm font-semibold tabular-nums text-primary">
                  {fmt(serverAmounts ? serverAmounts.codBalance : subtotal - estimateCodAdvance(subtotal), lineCurrency)}
                </span>
              </div>
            )}
```

- [ ] **Step 6: Browser verification**

Start the dev server, go to `/checkout` with an item in the cart, and check:
1. Default is "Pay in Full", existing behavior unchanged (visually and via a Network-tab check that `paymentMethod: 'full'` is sent).
2. Clicking "Cash on Delivery" updates the "Pay Now" figure to the estimated tier and shows a "Balance Due on Delivery" line.
3. Clicking Pay Now while COD is selected opens the Razorpay modal for the tiered advance amount, not the full total.

Use `preview_snapshot` to confirm both buttons render with the correct `aria`/visible state, and `preview_network` to inspect the actual `create-payment` request/response body.

- [ ] **Step 7: Commit**

```bash
git add src/pages/Checkout.jsx
git commit -m "feat(cod): payment-method toggle and balance display on checkout"
```

---

### Task 7: `OrderConfirmed.jsx` — show the balance due

**Files:**
- Modify: `src/pages/OrderConfirmed.jsx`

- [ ] **Step 1: Read the `bal` param and render the balance line**

After line 16 (`const source = searchParams.get('src');`), add:

```js
  const codBalance = Number(searchParams.get('bal')) || 0;
```

Insert a new block right after the confirmed-state heading/paragraph (after line 97's closing `</>` and before the closing `</div>` at line 98):

```jsx
              {codBalance > 0 && (
                <div className="mt-4 inline-block border border-acid bg-elevated px-4 py-2">
                  <p className="font-display text-xs font-semibold uppercase tracking-widest text-acid">
                    Balance due on delivery: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'INR' }).format(codBalance)}
                  </p>
                  <p className="mt-1 font-display text-[10px] uppercase tracking-wider text-secondary">
                    Please keep this amount ready in cash.
                  </p>
                </div>
              )}
```

- [ ] **Step 2: Browser verification**

Navigate directly to `/order-confirmed?n=TEST123&src=cart&bal=800` and confirm the balance-due box renders with ₹800. Then navigate to `/order-confirmed?n=TEST123&src=cart` (no `bal`) and confirm nothing extra renders — full-prepay confirmations must look exactly as before.

- [ ] **Step 3: Commit**

```bash
git add src/pages/OrderConfirmed.jsx
git commit -m "feat(cod): show balance due on the order confirmation page"
```

---

### Task 8: Live end-to-end verification (both payment methods)

**Files:** none (verification only)

- [ ] **Step 1: Run a full COD checkout locally against the real store**

With `netlify dev` running and real (or ₹1-priced test) products in the cart:
1. Go to `/checkout`, fill the form, select "Cash on Delivery".
2. Confirm the Razorpay modal opens for the tiered advance, not the full total.
3. Complete the tiny payment.
4. Confirm `/order-confirmed` shows the correct order number and "Balance due on delivery" figure.
5. Open Shopify Admin → Orders → the new order. Confirm: financial status "Partially paid", tags include `COD`, note includes `Balance due on delivery: ₹X`, and the order total (not the transaction) equals the full cart total.

- [ ] **Step 2: Run a full "Pay in Full" checkout as a regression check**

Repeat with "Pay in Full" selected. Confirm the order is created exactly as before this feature: financial status "Paid", no `COD` tag, no balance line in the note.

- [ ] **Step 3: Test a discount code that crosses the ₹1000 tier boundary**

Use a cart total and discount code combination where the pre-discount total is ≥ ₹1000 but the post-discount total is < ₹1000 (or vice versa). Confirm the actual Razorpay charge matches the *post-discount* tier, and the Shopify order's balance-due note matches `total − actually-charged`, not a client-estimated figure.

- [ ] **Step 4: No commit** — this task is verification only, nothing to stage.

---

### Task 9: Refund Policy wording (needs your approval before committing)

**Files:**
- Modify: `src/pages/legal/RefundPolicy.jsx`

- [ ] **Step 1: Propose wording, get sign-off**

Suggested addition to the existing refund policy copy: *"For Cash on Delivery orders, the advance payment collected at checkout is non-refundable if the order is refused at the doorstep or otherwise undelivered due to customer unavailability."*

**Do not commit this without explicit confirmation from the user on the exact wording** — this is customer-facing legal copy, not a design decision to make unilaterally.

- [ ] **Step 2: Once approved, add the sentence to the appropriate section of `RefundPolicy.jsx`, verify it renders on `/refund-policy`, and commit**

```bash
git add src/pages/legal/RefundPolicy.jsx
git commit -m "docs: note COD advance is non-refundable on refused delivery"
```

---

## Self-Review

**Spec coverage:** Advance tiers (Task 3) ✓. Single source of truth via charged amount (Tasks 4, 5) ✓. Checkout UI toggle + re-render from server (Task 6) ✓. `create-payment` validation/response shape (Tasks 1, 3) ✓. `confirm-order`/webhook mirroring (Tasks 4, 5) ✓. `createPaidOrder` tag/note/financial-status (Task 2) ✓. OrderConfirmed balance display (Task 7) ✓. Notes encoding for webhook recovery (Task 1) ✓. Idempotency-key caveat — documented in spec as a note for *if* `attemptId` is ever wired up; no current code path uses it, so no task needed (confirmed by re-reading `create-payment.js`: `readIdempotencyKey` reads `body?.attemptId`, but `Checkout.jsx` never sends `attemptId` today). Refund policy wording ✓ (Task 9, gated on approval). Out-of-scope items (PIN-code eligibility, balance cap, new email template, admin-configurable tiers) — intentionally have no tasks.

**Placeholder scan:** No TBD/TODO markers; every step has complete, exact code.

**Type consistency:** `codBalance` (rupees) and `chargedRupees` (rupees) are the two new parameters threaded through `create-payment.js` → `confirm-order.js`/`razorpay-webhook.js` → `createPaidOrder` — checked they're spelled identically at every hop. `paymentMethod` is `'full' | 'cod'` everywhere (payload, notes `m` key, Checkout.jsx state) — checked no task introduces a third spelling like `'prepaid'` or `'COD'` (capitalized) for this field. The `COD` tag string on the Shopify order is intentionally uppercase and separate from the `paymentMethod` value — not a naming inconsistency, a different piece of data (customer-facing tag vs. internal enum).
