import { Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import ShopAll from './pages/ShopAll.jsx';
import Product from './pages/Product.jsx';
import Cart from './pages/Cart.jsx';
import Account from './pages/Account.jsx';
import Categories from './pages/Categories.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { trackPageView } from './lib/analytics/ga4.js';

export default function App() {
  const location = useLocation();

  // Fire a GA4 page_view on every route change (skip on StrictMode double-invoke).
  useEffect(() => {
    const t = setTimeout(() => trackPageView(location.pathname), 0);
    return () => clearTimeout(t);
  }, [location.pathname]);

  return (
    <Layout>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<ErrorBoundary><Home /></ErrorBoundary>} />
          <Route path="/shop" element={<ErrorBoundary><ShopAll /></ErrorBoundary>} />
          <Route path="/product/:handle" element={<ErrorBoundary><Product /></ErrorBoundary>} />
          <Route path="/cart" element={<ErrorBoundary><Cart /></ErrorBoundary>} />
          <Route path="/account" element={<ErrorBoundary><Account /></ErrorBoundary>} />
          <Route path="/categories" element={<ErrorBoundary><Categories /></ErrorBoundary>} />
        </Routes>
      </ErrorBoundary>
    </Layout>
  );
}
