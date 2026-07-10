# Cash on Delivery with Partial Prepayment — Design

## Problem

The current checkout only supports paying the full order total upfront via
Razorpay. We want a Cash on Delivery option too, but a pure-COD flow (₹0
upfront) has a well-known abandonment/no-show problem for D2C brands in
India. The mitigation is a small non-refundable advance charged online, with
the remainder collected as cash at delivery.

Razorpay cannot process the COD leg itself — that's literal cash handed to a
courier, outside any gateway. The advance is a normal Razorpay charge; "the
rest is COD" is purely data attached to the Shopify order for fulfillment
staff to act on.

## Advance tiers

Computed from the server-side re-priced total (post-discount, the same
authoritative total `priceCart` already produces) — not the client-displayed
subtotal, so a discount code can't be used to dodge the tier:

- Total < ₹1000 → ₹200 advance
- Total ≥ ₹1000 → ₹300 advance

No eligibility restrictions (PIN code, product type, cart contents) and no
cap on balance size — a ₹50,000 order still only needs ₹300 upfront.

## UI (`src/pages/Checkout.jsx`)

A payment-method toggle above the Pay button: **Pay in Full** (existing
behavior, default) vs **Cash on Delivery**. Selecting COD updates the order
summary to show:

- Advance to pay now: ₹200 / ₹300 (computed client-side from the displayed
  subtotal for immediate feedback; server re-derives and is authoritative)
- Balance due on delivery: ₹(total − advance)

The Razorpay Checkout.js modal flow is unchanged — it just charges a smaller
amount for COD orders.

## `create-payment` function

Request payload gains `paymentMethod: 'cod' | 'full'` (default `'full'` if
absent, for backward compatibility with any in-flight sessions). After
`priceCart` computes the authoritative `total`:

- `'full'` → charge `total` (existing behavior)
- `'cod'` → compute the tier server-side from `total`, charge only the
  advance amount

Response gains `codBalance` (0 for `'full'`) so the frontend can show the
correct "balance due" figure sourced from the authoritative total, not its
own estimate.

## `confirm-order` / `razorpay-webhook` functions

Both call `createPaidOrder` and must pass the same `codBalance` — mirrored
in both places the same way `discount` already is, since the webhook is the
fallback path if `confirm-order` fails after a real charge.

## `lib/shopify.js` — `createPaidOrder`

New parameter `codBalance` (rupees, 0 for full-prepay orders). When
`codBalance > 0`:

- `financialStatus: 'PARTIALLY_PAID'` instead of `'PAID'` (Shopify derives
  "partially paid" from order total vs. transaction total; this makes that
  explicit rather than inferred)
- `transactions[0].amountSet` reflects only the advance actually captured,
  not the full order total
- `tags` gains `'COD'` alongside the existing `rzp_<id>` tag
- `note` gains an additional line: `Balance due on delivery: ₹<amount>`

## `lib/payload.js` — `validatePayload`

Passes `paymentMethod` through unchanged if present and one of `'cod' |
'full'`; defaults to `'full'` otherwise. No change to `encodeNotes` /
`decodeNotes` — `paymentMethod` isn't needed for the webhook's Razorpay-notes
recovery path since the webhook re-derives `codBalance` from the re-priced
total the same way `create-payment` did originally... but the webhook has no
way to know which tier/mode was originally chosen unless it's recorded.

**Resolved:** `paymentMethod` must be encoded into Razorpay order notes
(alongside `items`/`email`/`addr1`/`addr2`/`code`) so `decodeNotes` can
recover it — otherwise the webhook fallback path can't tell a COD order from
a full-prepay one and would charge/report the wrong balance. Add a single
`m` key (`'c'` for cod, `'f'` for full) to stay well inside Razorpay's
≤15-keys/≤512-chars-per-value notes limits.

## Out of scope

- No PIN-code/product/cart-content eligibility restrictions on COD.
- No cap on balance size.
- No new email template — Shopify's native order-confirmation email already
  shows balance due once financial status is "Partially paid."
- No admin-configurable tier thresholds (₹1000 cutoff, ₹200/₹300 amounts are
  hardcoded constants, matching how `PRODUCTS_TARGET`-style config already
  lives directly in code in this project rather than an admin UI).
