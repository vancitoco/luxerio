# Vancito.co — Custom On-Site Checkout (Embedded Razorpay)

**Date:** 2026-07-08
**Replaces:** Shopify hosted-checkout redirect (both entry points)
**Backend:** Netlify Functions (site will deploy on Netlify)
**Payments:** Razorpay Orders API + Checkout.js modal, prepaid only — no COD

## Goal

Customer never leaves vancito.co to pay. Cart "Initiate Checkout" and product-page
"Buy Now" both land on an in-app `/checkout` route; Razorpay's payment modal opens
over the page; on success a real Shopify order is created (marked paid) via the
Admin API. Shopify stays the single source of truth for orders, inventory, and
customer records.

## Decisions (from brainstorm)

| Question | Decision |
|---|---|
| Entry points | Both cart checkout AND Buy Now, one build |
| Shipping | Free shipping on all orders (no shipping line) |
| Tax | Prices are tax-inclusive, no separate tax line |
| Discount codes | Keep — validated/priced by Shopify server-side |
| Accounts | Guest checkout allowed; prefill from account when logged in |
| Inventory reservation | Skipped for v1 (accepted oversell risk on race) |
| Payment methods | Prepaid only (UPI/cards/netbanking/wallets). No COD — also keep COD disabled in Razorpay dashboard |
| Order creation strategy | Direct Admin `orderCreate` after payment (no Draft Orders — nothing for Shopify to calculate since tax-inclusive + free shipping). Upgrade path: switch to Draft Orders if real tax/shipping ever needed |

## Architecture

```
Browser (/checkout)                Netlify Functions                    External
─────────────────                  ─────────────────                    ────────
fill address/contact
click PAY ──────────────────────▶  create-payment
                                     ├─ fetch real variant prices ────▶ Shopify Storefront/Admin API
                                     ├─ discount? apply code to a
                                     │  Shopify cart, read its total ─▶ Shopify Storefront API
                                     ├─ total → integer paise
                                     └─ create Razorpay Order
                                        (payload in order notes) ─────▶ Razorpay Orders API
◀── razorpay order id + amount ──────┘
open Checkout.js modal (in-page)
customer pays ──────────────────────────────────────────────────────▶ Razorpay
◀── signed success payload
call confirm-order ─────────────▶  confirm-order
                                     ├─ verify HMAC signature (KEY_SECRET)
                                     ├─ idempotency: existing order
                                     │  tagged razorpay_order_id? return it
                                     └─ Admin orderCreate (paid) ─────▶ Shopify Admin API
◀── order number ────────────────────┘
redirect /order-confirmed

                    (safety net, async)
Razorpay ──payment.captured──────▶  razorpay-webhook
                                     ├─ verify webhook signature
                                     └─ same idempotent create-order,
                                        payload from Razorpay order notes
```

## Backend — Netlify Functions (`netlify/functions/`)

### 1. `create-payment`
- **Input:** `{ lines: [{ variantId, quantity }], discountCode?, email, address }`
- Never trusts client prices. Fetches each variant's current price from Shopify
  server-side.
- Discount path: creates a throwaway Shopify cart with the same lines, applies the
  code via `cartDiscountCodesUpdate`, reads Shopify's computed
  `cost.totalAmount`. Code invalid/inapplicable → returns error before any charge.
- Total = Shopify-computed amount (tax-inclusive, free shipping) → **integer paise**
  (round, never float) → Razorpay `orders.create`.
- Stores a compact recovery payload in the Razorpay order `notes` (variant ids +
  quantities, email, address fields, discount code) — the webhook rebuilds the
  Shopify order from this if the browser never confirms. Notes limits: ≤15 keys,
  ≤512 chars/value; payload split across keys; oversized edge case (huge cart)
  degrades to `notes.recovery = "partial"` and manual reconciliation.
- **Returns:** `{ razorpayOrderId, amountPaise, currency: "INR", keyId }`

### 2. `confirm-order`
- **Input:** `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }` +
  the same lines/contact/address payload.
- Verifies `razorpay_signature` = HMAC-SHA256(`order_id|payment_id`, KEY_SECRET).
  Bad signature → 400, nothing created.
- **Idempotent:** queries Admin API for an order tagged `rzp_<razorpay_order_id>`;
  if found, returns that order number (handles double-click, webhook race).
- Creates the order via Admin GraphQL `orderCreate`:
  - line items by variant id + quantity
  - shipping address, email, phone
  - transaction: kind SALE, status SUCCESS, amount, gateway `"Razorpay"`
  - tags: `rzp_<razorpay_order_id>`; custom attributes / note: payment id
  - discount (when used): custom discount matching Shopify's computed amount +
    code recorded in note. **Known caveat:** Admin-created orders do not enforce
    or increment discount-code usage limits — validation happens at pricing time
    only.
  - `options.inventoryBehaviour: DECREMENT_OBEYING_POLICY` (explicit — default
    would NOT decrement stock)
  - `options.sendReceipt: true` (Shopify sends the standard order-confirmation
    email)
- **Returns:** `{ orderNumber, orderId }`

### 3. `razorpay-webhook`
- Endpoint registered in Razorpay dashboard for `payment.captured`.
- Verifies `X-Razorpay-Signature` with `RAZORPAY_WEBHOOK_SECRET`.
- Same idempotent create-order routine, payload reconstructed from the Razorpay
  order `notes`. Covers: customer paid, then closed tab / lost network before
  `confirm-order` ran. If notes payload marked partial → log loudly + create
  nothing (manual reconciliation from Razorpay dashboard).

### Secrets (Netlify env vars only — never in frontend bundle or repo)
`RAZORPAY_KEY_ID` (public-ish, also returned to browser), `RAZORPAY_KEY_SECRET`,
`RAZORPAY_WEBHOOK_SECRET`, `SHOPIFY_ADMIN_TOKEN` (custom app,
`write_orders` + `read_products` scopes), `SHOPIFY_STOREFRONT_TOKEN` (existing).

## Frontend

### `/checkout` route (new page)
- Two-column (stacked on mobile): left = contact + address form, right = order
  summary with existing discount-code field behavior.
- Form fields mirror Shopify checkout: email, first/last name, address, apartment,
  city, state, PIN, phone. Prefilled from customer account when logged in; guest
  entry otherwise. Basic client validation (required fields, PIN/phone format).
- PAY button: calls `create-payment` → loads Razorpay Checkout.js (script from
  Razorpay CDN) → opens modal in-page with prefill (name/email/phone) and brand
  color `#111111`. Modal dismissed → button re-enables, no charge.
- Success handler → `confirm-order` → navigate `/order-confirmed?n=<orderNumber>`.
- If payment verified but order creation fails (or times out): show
  **"Payment received — your order is being confirmed"** + support contact, never
  a scary error. Webhook completes the order server-side.

### `/order-confirmed` route (new page)
Order number, thank-you copy, CONTINUE SHOPPING link. Cart-path orders clear the
persistent bag here (not before).

### Entry-point changes
- `CartContext.initiateCheckout` → `navigate('/checkout')` with bag lines (no more
  `checkoutUrl` redirect).
- `Product.jsx` `handleBuyNow` → `navigate('/checkout')` with the single selected
  variant (replaces standalone cartCreate + redirect). Bag untouched by Buy Now,
  as today.
- Checkout state (lines + source) passed via router state with sessionStorage
  fallback (survives refresh on /checkout).
- Replace stale "Free expedited shipping on orders over $100" trust line with
  accurate free-shipping copy (site-wide).

### Config
- `netlify.toml`: build command, publish dir, functions dir, SPA fallback redirect
  (`/* → /index.html 200`), functions env documented.

## Failure Modes

| Scenario | Handling |
|---|---|
| Client tampers with price | Impossible — totals computed server-side from Shopify prices |
| Fake "payment success" call | HMAC signature verification rejects |
| Double confirm (double-click / webhook race) | Idempotency tag lookup returns existing order |
| Paid, browser died before confirm | Webhook creates order from Razorpay notes |
| Paid, Shopify orderCreate down | Client shows "payment received, confirming"; webhook retries later (Razorpay retries webhooks); worst case manual reconciliation from Razorpay dashboard, payment id in hand |
| Discount code invalid | Rejected at create-payment, before modal opens |
| Modal dismissed / payment failed | No order, button re-enables, bag intact |

## Out of Scope (v1)
Inventory reservation during checkout; Shopify-calculated tax or shipping;
enforced discount usage limits; COD or partial payments; refund UI (use Razorpay
+ Shopify dashboards).

## Cutover
Hosted Shopify checkout (with Razorpay Secure) keeps working during development.
Cutover = deploying the entry-point changes. Roll back = revert those two
call sites.

## Prerequisites (user-provided)
1. Razorpay **test-mode** Key ID + Secret; webhook secret after registering the
   webhook URL post-first-deploy.
2. Shopify custom app Admin token: Admin → Settings → Apps → Develop apps →
   create app → Admin API scopes `write_orders`, `read_products` → install →
   token.
3. Netlify site connected to the repo (functions need deploy to be reachable;
   local dev via `netlify dev`).

## Success Criteria
- Complete a test-mode purchase (cart path AND Buy Now path) without leaving
  vancito.co; order appears in Shopify admin marked paid, inventory decremented,
  confirmation email sent, Razorpay payment id traceable on the order.
- Kill the tab between payment and confirm → order still appears (webhook).
- Repeat confirm calls → exactly one order.
- Discount code produces Shopify-computed total; invalid code blocked pre-modal.
- No secret present in the built frontend bundle.
