import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCustomer } from '../context/CustomerContext.jsx';
import AuthModal from '../components/AuthModal.jsx';
import OrdersTab from '../components/account/OrdersTab.jsx';
import ProfileTab from '../components/account/ProfileTab.jsx';

const TABS = [
  { id: 'orders',  label: 'Orders' },
  { id: 'profile', label: 'Profile' },
];

export default function Account() {
  const { customer, loading, logout } = useCustomer();
  const [searchParams, setSearchParams] = useSearchParams();
  const [authOpen, setAuthOpen] = useState(false);

  const tab = searchParams.get('tab') ?? 'orders';
  const setTab = (t) => setSearchParams({ tab: t }, { replace: true });

  // Open auth modal if not logged in and not loading.
  useEffect(() => {
    if (!loading && !customer) setAuthOpen(true);
  }, [loading, customer]);

  const orders = customer?.orders?.edges?.map((e) => e.node) ?? [];

  if (loading) {
    return (
      <div className="mx-auto max-w-[1280px] px-6 py-16 lg:px-16">
        <div className="flex flex-col gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 animate-pulse bg-elevated" />
          ))}
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6 text-center">
          <span className="inline-block bg-primary px-3 py-1 font-display text-[10px] font-semibold uppercase tracking-widest text-base">
            Access Required
          </span>
          <h1 className="font-display text-3xl font-semibold uppercase tracking-[0.1em] text-primary">
            Sign in to your account.
          </h1>
          <button
            type="button"
            onClick={() => setAuthOpen(true)}
            className="border border-hairline px-8 py-3 font-display text-[10px] font-semibold uppercase tracking-widest text-primary transition-colors hover:border-acid hover:text-acid"
          >
            Sign In / Create Account
          </button>
        </div>
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      </>
    );
  }

  return (
    <div className="mx-auto max-w-[1280px] px-6 py-10 lg:px-16">
      {/* Header. */}
      <div className="mb-10 flex items-start justify-between border-b border-hairline pb-6">
        <div>
          <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.1em] text-primary md:text-5xl">
            {customer.firstName ? `${customer.firstName} ${customer.lastName ?? ''}`.trim() : 'Account'}
          </h1>
          <p className="mt-2 font-display text-[10px] uppercase tracking-widest text-secondary">
            {customer.email}
          </p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="flex items-center gap-2 font-display text-[10px] font-semibold uppercase tracking-widest text-secondary transition-colors hover:text-primary"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
          Logout
        </button>
      </div>

      {/* Tab nav. */}
      <div className="mb-8 flex gap-0 border-b border-hairline">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            aria-selected={tab === t.id}
            role="tab"
            className={`px-6 pb-3 font-display text-[10px] font-semibold uppercase tracking-widest transition-colors ${
              tab === t.id
                ? 'border-b-2 border-acid text-primary'
                : 'text-secondary hover:text-primary'
            }`}
          >
            {t.label}
            {t.id === 'orders' && orders.length > 0 && (
              <span className="ml-2 font-display text-[9px] text-acid">({orders.length})</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content. */}
      {tab === 'orders'  && <OrdersTab orders={orders} />}
      {tab === 'profile' && <ProfileTab />}
    </div>
  );
}
