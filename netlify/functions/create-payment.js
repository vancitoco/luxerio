import crypto from 'node:crypto';
import { validatePayload, encodeNotes } from './lib/payload.js';
import { priceCart } from './lib/shopify.js';
import { createRazorpayOrder } from './lib/razorpay.js';

const COD_TIER_THRESHOLD_RUPEES = 1000;
const COD_ADVANCE_BELOW_THRESHOLD = 200;
const COD_ADVANCE_AT_OR_ABOVE_THRESHOLD = 300;

function codAdvanceRupees(totalRupees) {
  return totalRupees < COD_TIER_THRESHOLD_RUPEES
    ? COD_ADVANCE_BELOW_THRESHOLD
    : COD_ADVANCE_AT_OR_ABOVE_THRESHOLD;
}

const json = (status, body) => ({
  statusCode: status,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

// Optional, client-generated: the frontend mints one id per checkout attempt
// and resends the SAME id if it retries that attempt (e.g. network blip before
// a response arrives), so a retry reuses the original Razorpay order instead of
// creating a duplicate. Must be a short opaque token, not attacker-influenced
// beyond that — never trusted for anything but Razorpay's own idempotency check.
function readIdempotencyKey(body) {
  const key = body?.attemptId;
  return typeof key === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(key) ? key : undefined;
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  let rawBody, payload;
  try {
    rawBody = JSON.parse(event.body);
    payload = validatePayload(rawBody);
  } catch {
    payload = null;
  }
  if (!payload) return json(400, { error: 'Invalid checkout payload' });

  try {
    const { total, discount } = await priceCart(payload.lines, payload.discountCode);
    const isCod = payload.paymentMethod === 'cod';
    const chargeRupees = isCod ? codAdvanceRupees(total) : total;
    const codBalance = isCod ? total - chargeRupees : 0;
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
}
