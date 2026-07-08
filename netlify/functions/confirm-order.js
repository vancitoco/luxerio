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
    // confirming"; webhook will finish the job. This also covers the case where
    // razorpay_order_id has an unexpected shape: findOrderByRzpId throws on that,
    // and that throw is caught right here, degrading safely instead of leaking
    // an unhandled error.
    return json(502, { error: 'ORDER_PENDING', razorpayOrderId: razorpay_order_id });
  }
}
