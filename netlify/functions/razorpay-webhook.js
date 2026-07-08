import { verifyWebhookSignature, fetchRazorpayOrder } from './lib/razorpay.js';
import { decodeNotes } from './lib/payload.js';
import { findOrderByRzpId, createPaidOrder, priceCart } from './lib/shopify.js';

const json = (status, body) => ({ statusCode: status, body: JSON.stringify(body) });

// Netlify normalizes incoming header names to lowercase, but we don't rely on
// that assumption blindly — look up the header case-insensitively so a
// differently-cased runtime (or a future migration off Netlify) can't silently
// disable signature verification.
function getHeader(headers, name) {
  if (!headers) return undefined;
  const lower = name.toLowerCase();
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === lower) return headers[key];
  }
  return undefined;
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') return json(405, {});
  const signature = getHeader(event.headers, 'x-razorpay-signature');
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
    // Includes the malformed-rzpOrderId case: findOrderByRzpId throws on a
    // shape that doesn't match /^order_[A-Za-z0-9]+$/, and that throw lands
    // here, not as an unhandled rejection. A 500 tells Razorpay to retry.
    console.error('[webhook]', rzpOrderId, err);
    return json(500, { error: 'retry' }); // non-2xx → Razorpay retries
  }
}
