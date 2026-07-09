import { Routes, Route, useLocation } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import Layout from './components/Layout.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { trackPageView } from './lib/analytics/ga4.js';

// Route-level code splitting: each page is its own chunk, loaded on demand.
// This matters beyond bundle size — some ad blockers false-positive-block
// files with names like "PrivacyPolicy.jsx" as tracking scripts. With eager
// imports, one blocked chunk breaks the whole module graph and blanks the
// entire site for that visitor. Lazy-loaded, a blocked route only fails
// itself — everything else keeps working.
const Home = lazy(() => import('./pages/Home.jsx'));
const ShopAll = lazy(() => import('./pages/ShopAll.jsx'));
const Product = lazy(() => import('./pages/Product.jsx'));
const Cart = lazy(() => import('./pages/Cart.jsx'));
const Account = lazy(() => import('./pages/Account.jsx'));
const Categories = lazy(() => import('./pages/Categories.jsx'));
const Checkout = lazy(() => import('./pages/Checkout.jsx'));
const OrderConfirmed = lazy(() => import('./pages/OrderConfirmed.jsx'));
const PrivacyPolicy = lazy(() => import('./pages/legal/PrivacyPolicy.jsx'));
const TermsAndConditions = lazy(() => import('./pages/legal/TermsAndConditions.jsx'));
const RefundPolicy = lazy(() => import('./pages/legal/RefundPolicy.jsx'));
const ShippingPolicy = lazy(() => import('./pages/legal/ShippingPolicy.jsx'));

export default function App() {
  const location = useLocation();

  // Fire a GA4 page_view on every route change (skip on StrictMode double-invoke).
  useEffect(() => {
    const t = setTimeout(() => trackPageView(location.pathname), 0);
    return () => clearTimeout(t);
  }, [location.pathname]);

  // Reset scroll on every navigation — React Router doesn't do this by default.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <Layout>
      <ErrorBoundary>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<ErrorBoundary><Home /></ErrorBoundary>} />
            <Route path="/shop" element={<ErrorBoundary><ShopAll /></ErrorBoundary>} />
            <Route path="/product/:handle" element={<ErrorBoundary><Product /></ErrorBoundary>} />
            <Route path="/cart" element={<ErrorBoundary><Cart /></ErrorBoundary>} />
            <Route path="/account" element={<ErrorBoundary><Account /></ErrorBoundary>} />
            <Route path="/categories" element={<ErrorBoundary><Categories /></ErrorBoundary>} />
            <Route path="/checkout" element={<ErrorBoundary><Checkout /></ErrorBoundary>} />
            <Route path="/order-confirmed" element={<ErrorBoundary><OrderConfirmed /></ErrorBoundary>} />
            <Route path="/privacy-policy" element={<ErrorBoundary><PrivacyPolicy /></ErrorBoundary>} />
            <Route path="/terms-conditions" element={<ErrorBoundary><TermsAndConditions /></ErrorBoundary>} />
            <Route path="/refund-policy" element={<ErrorBoundary><RefundPolicy /></ErrorBoundary>} />
            <Route path="/shipping-policy" element={<ErrorBoundary><ShippingPolicy /></ErrorBoundary>} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </Layout>
  );
}
