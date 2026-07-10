import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomer } from '../context/CustomerContext.jsx';
import { readCheckout } from '../lib/checkout/session.js';

function fmt(amount, currencyCode = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(amount);
}

const INDIAN_STATES = [
  { code: 'AN', label: 'Andaman and Nicobar Islands' },
  { code: 'AP', label: 'Andhra Pradesh' },
  { code: 'AR', label: 'Arunachal Pradesh' },
  { code: 'AS', label: 'Assam' },
  { code: 'BR', label: 'Bihar' },
  { code: 'CH', label: 'Chandigarh' },
  { code: 'CT', label: 'Chhattisgarh' },
  { code: 'DN', label: 'Dadra and Nagar Haveli and Daman and Diu' },
  { code: 'DL', label: 'Delhi' },
  { code: 'GA', label: 'Goa' },
  { code: 'GJ', label: 'Gujarat' },
  { code: 'HR', label: 'Haryana' },
  { code: 'HP', label: 'Himachal Pradesh' },
  { code: 'JK', label: 'Jammu and Kashmir' },
  { code: 'JH', label: 'Jharkhand' },
  { code: 'KA', label: 'Karnataka' },
  { code: 'KL', label: 'Kerala' },
  { code: 'LA', label: 'Ladakh' },
  { code: 'LD', label: 'Lakshadweep' },
  { code: 'MP', label: 'Madhya Pradesh' },
  { code: 'MH', label: 'Maharashtra' },
  { code: 'MN', label: 'Manipur' },
  { code: 'ML', label: 'Meghalaya' },
  { code: 'MZ', label: 'Mizoram' },
  { code: 'NL', label: 'Nagaland' },
  { code: 'OR', label: 'Odisha' },
  { code: 'PY', label: 'Puducherry' },
  { code: 'PB', label: 'Punjab' },
  { code: 'RJ', label: 'Rajasthan' },
  { code: 'SK', label: 'Sikkim' },
  { code: 'TN', label: 'Tamil Nadu' },
  { code: 'TG', label: 'Telangana' },
  { code: 'TR', label: 'Tripura' },
  { code: 'UP', label: 'Uttar Pradesh' },
  { code: 'UT', label: 'Uttarakhand' },
  { code: 'WB', label: 'West Bengal' },
];

// Netlify dev/cold-start can return an empty or truncated body — fall back to
// a friendly message instead of letting res.json() throw a raw parse error.
async function parseJsonResponse(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error('Something went wrong on our end — please try again.');
  }
}

let razorpayScriptPromise = null;

function loadRazorpayScript() {
  if (typeof window !== 'undefined' && window.Razorpay) return Promise.resolve();
  if (razorpayScriptPromise) return razorpayScriptPromise;
  razorpayScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-razorpay-checkout]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Could not load payment gateway.')));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.setAttribute('data-razorpay-checkout', 'true');
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load payment gateway.'));
    document.head.appendChild(script);
  });
  return razorpayScriptPromise;
}

const emptyForm = {
  email: '',
  firstName: '',
  lastName: '',
  address1: '',
  address2: '',
  city: '',
  provinceCode: '',
  zip: '',
  phone: '',
};

const COD_TIER_THRESHOLD = 1000;
const COD_ADVANCE_BELOW = 200;
const COD_ADVANCE_AT_OR_ABOVE = 300;

function estimateCodAdvance(subtotal) {
  return subtotal < COD_TIER_THRESHOLD ? COD_ADVANCE_BELOW : COD_ADVANCE_AT_OR_ABOVE;
}

export default function Checkout() {
  const navigate = useNavigate();
  const { customer } = useCustomer();
  const [session, setSession] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [discountCode, setDiscountCode] = useState('');
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('full');
  // Set once the server responds — authoritative, overrides the client
  // estimate below (a discount crossing the ₹1000 boundary can make the
  // real charge disagree with the client-side guess).
  const [serverAmounts, setServerAmounts] = useState(null); // { advancePaise, codBalance } | null

  // Load checkout session on mount; bail to /cart if empty/expired.
  useEffect(() => {
    const s = readCheckout();
    if (!s) {
      navigate('/cart');
      return;
    }
    setSession(s);
  }, [navigate]);

  // Prefill from logged-in customer.
  useEffect(() => {
    if (!customer) return;
    setForm((prev) => ({
      ...prev,
      email: prev.email || customer.email || '',
      firstName: prev.firstName || customer.firstName || '',
      lastName: prev.lastName || customer.lastName || '',
    }));
  }, [customer]);

  const lines = session?.lines ?? [];
  const lineCurrency = lines[0]?.currencyCode || 'USD';
  const subtotal = useMemo(
    () => lines.reduce((sum, l) => sum + l.price * l.quantity, 0),
    [lines],
  );

  function handleField(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handlePay(e) {
    e.preventDefault();
    if (!session) return;
    setPaying(true);
    setPayError(null);
    setServerAmounts(null);
    try {
      const checkoutPayload = {
        lines: session.lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
        email: form.email,
        address: { ...form },
        discountCode: discountCode.trim() ? discountCode.trim().toUpperCase() : null,
        paymentMethod,
      };
      const res = await fetch('/.netlify/functions/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkoutPayload),
      });
      const data = await parseJsonResponse(res);
      if (!res.ok) throw new Error(data.error || 'Could not start payment');

      setServerAmounts({ advancePaise: data.amountPaise, codBalance: data.codBalance ?? 0 });

      await loadRazorpayScript();
      const rzp = new window.Razorpay({
        key: data.keyId,
        order_id: data.razorpayOrderId,
        amount: data.amountPaise,
        currency: 'INR',
        name: 'Vancito.co',
        prefill: { name: `${form.firstName} ${form.lastName}`, email: form.email, contact: form.phone },
        theme: { color: '#111111' },
        remember_customer: false,
        modal: { ondismiss: () => setPaying(false) },
        handler: async (rsp) => {
          try {
            const confirmRes = await fetch('/.netlify/functions/confirm-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...rsp, checkout: checkoutPayload }),
            });
            const confirm = await parseJsonResponse(confirmRes);
            if (confirmRes.ok) {
              const balSuffix = confirm.codBalance > 0 ? `&bal=${confirm.codBalance}` : '';
              navigate(`/order-confirmed?n=${encodeURIComponent(confirm.orderNumber)}&src=${session.source}${balSuffix}`);
            } else if (confirm.error === 'ORDER_PENDING') {
              navigate(`/order-confirmed?pending=1&src=${session.source}`);
            } else {
              setPayError('Payment verification failed. If you were charged, contact support with your payment reference.');
              setPaying(false);
            }
          } catch {
            setPayError('Payment received but confirmation failed. If you were charged, contact support with your payment reference — do not pay again.');
            setPaying(false);
          }
        },
      });
      rzp.on('payment.failed', () => {
        setPayError('Payment failed. You have not been charged — try again.');
        setPaying(false);
      });
      rzp.open();
    } catch (err) {
      setPayError(err.message);
      setPaying(false);
    }
  }

  if (!session) return null;

  return (
    <div className="mx-auto max-w-[1280px] px-6 py-10 lg:px-16">
      {/* Header. */}
      <div className="mb-10 border-b border-hairline pb-6">
        <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.1em] text-primary md:text-5xl">
          Checkout
        </h1>
        <p className="mt-2 font-display text-[10px] uppercase tracking-widest text-secondary">
          {lines.length} item{lines.length !== 1 ? 's' : ''} — enter shipping details to complete payment.
        </p>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-12">
        {/* Form. */}
        <form onSubmit={handlePay} className="flex-1 flex flex-col gap-8">
          {/* Contact. */}
          <section className="flex flex-col gap-4 border border-hairline bg-surface p-6">
            <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-primary">
              Contact
            </h2>
            <Field label="Email" name="email" type="email" value={form.email} onChange={handleField} required autoComplete="email" />
            <Field label="Phone" name="phone" type="tel" value={form.phone} onChange={handleField} required autoComplete="tel" />
          </section>

          {/* Shipping address. */}
          <section className="flex flex-col gap-4 border border-hairline bg-surface p-6">
            <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-primary">
              Shipping Address
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="First Name" name="firstName" value={form.firstName} onChange={handleField} required autoComplete="given-name" />
              <Field label="Last Name" name="lastName" value={form.lastName} onChange={handleField} required autoComplete="family-name" />
            </div>
            <Field label="Address Line 1" name="address1" value={form.address1} onChange={handleField} required autoComplete="address-line1" />
            <Field label="Address Line 2 (optional)" name="address2" value={form.address2} onChange={handleField} autoComplete="address-line2" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="City" name="city" value={form.city} onChange={handleField} required autoComplete="address-level2" />
              <div className="flex flex-col gap-1.5">
                <label htmlFor="provinceCode" className="font-display text-[10px] font-semibold uppercase tracking-widest text-secondary">
                  State
                </label>
                <select
                  id="provinceCode"
                  name="provinceCode"
                  value={form.provinceCode}
                  onChange={handleField}
                  required
                  className="border border-hairline bg-base px-4 py-2.5 font-display text-[11px] uppercase tracking-widest text-primary focus:border-acid focus:outline-none"
                >
                  <option value="" disabled>Select state</option>
                  {INDIAN_STATES.map((s) => (
                    <option key={s.code} value={s.code}>{s.label}</option>
                  ))}
                </select>
              </div>
              <Field label="PIN Code" name="zip" value={form.zip} onChange={handleField} required autoComplete="postal-code" />
            </div>
          </section>

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

          {/* Discount code. */}
          <section className="flex flex-col gap-2 border border-hairline bg-surface p-6">
            <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-primary">
              Discount Code
            </h2>
            <input
              type="text"
              value={discountCode}
              onChange={(e) => { setDiscountCode(e.target.value); setServerAmounts(null); }}
              placeholder="Enter code (optional)"
              className="border border-hairline bg-base px-4 py-2.5 font-display text-[11px] uppercase tracking-widest text-primary placeholder:text-secondary focus:border-acid focus:outline-none"
            />
            <p className="font-display text-[9px] uppercase tracking-widest text-secondary">
              Applied at payment — validity and discount amount are confirmed when you press pay.
            </p>
          </section>

          {payError && (
            <p className="border border-hairline bg-surface px-4 py-3 font-display text-[11px] uppercase tracking-widest text-red-400">
              {payError}
            </p>
          )}

          <button
            type="submit"
            disabled={paying}
            aria-busy={paying}
            className="flex w-full items-center justify-center gap-3 bg-primary py-4 font-display text-sm font-semibold uppercase tracking-widest text-base transition-colors hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {paying ? 'Processing…' : 'Pay Now'}
          </button>
        </form>

        {/* Summary. */}
        <aside className="sticky top-20 flex flex-col gap-0 border border-hairline bg-surface lg:min-w-[320px]">
          <div className="border-b border-hairline px-6 py-5">
            <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-primary">
              Order Summary
            </h2>
          </div>

          <div className="flex flex-col gap-4 px-6 py-5">
            {lines.map((line, i) => (
              <div key={`${line.variantId}-${i}`} className="flex items-center gap-4 border-b border-hairline pb-4 last:border-b-0 last:pb-0">
                <div className="h-16 w-14 shrink-0 overflow-hidden bg-elevated">
                  {line.image ? (
                    <img src={line.image} alt={line.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-elevated to-[#0a0a0a]" />
                  )}
                </div>
                <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                  <p className="font-display text-xs font-semibold uppercase leading-tight tracking-[0.08em] text-primary">
                    {line.title}
                  </p>
                  {line.variant && line.variant !== 'Default Title' && (
                    <p className="font-display text-[10px] uppercase tracking-wider text-secondary">
                      {line.variant}
                    </p>
                  )}
                  <p className="font-display text-[10px] uppercase tracking-wider text-secondary">
                    Qty {line.quantity}
                  </p>
                </div>
                <p className="shrink-0 font-display text-xs font-semibold tabular-nums text-primary">
                  {fmt(line.price * line.quantity, line.currencyCode || 'INR')}
                </p>
              </div>
            ))}

            <div className="h-px bg-hairline" />

            <div className="flex items-center justify-between">
              <span className="font-display text-[10px] font-bold uppercase tracking-widest text-secondary">
                Subtotal
              </span>
              <span className="font-display text-sm font-semibold tabular-nums text-primary">
                {fmt(subtotal, lineCurrency)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-display text-[10px] font-bold uppercase tracking-widest text-secondary">
                Shipping
              </span>
              <span className="font-display text-[10px] font-bold uppercase tracking-widest text-acid">
                Free
              </span>
            </div>

            {discountCode.trim() && (
              <p className="font-display text-[9px] uppercase tracking-widest text-secondary">
                Discount applied at payment — total shown excludes it.
              </p>
            )}

            <div className="h-px bg-hairline" />

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

            <div className="flex items-center justify-center gap-2 text-center font-display text-[9px] uppercase tracking-widest text-secondary">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Secure encrypted transaction
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Field({ label, name, type = 'text', value, onChange, required, autoComplete }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="font-display text-[10px] font-semibold uppercase tracking-widest text-secondary">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        autoComplete={autoComplete}
        className="border border-hairline bg-base px-4 py-2.5 font-display text-[11px] uppercase tracking-widest text-primary placeholder:text-secondary focus:border-acid focus:outline-none"
      />
    </div>
  );
}
