import { useState, useRef, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { MagnifyingGlass, ShoppingBag, User, List, X, CaretDown } from '@phosphor-icons/react';
import { useCart } from '../context/CartContext.jsx';
import { useCustomer } from '../context/CustomerContext.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import SearchModal from './SearchModal.jsx';
import AuthModal from './AuthModal.jsx';

const NAV_GROUPS = [
  {
    label: 'Men',
    items: [
      { label: 'T-Shirts', value: 't-shirts' },
      { label: 'Shirts', value: 'shirts' },
      { label: 'Jeans', value: 'jeans' },
      { label: 'Trousers', value: 'trousers' },
      { label: "Men's Shoes", value: 'mens-shoes' },
      { label: 'Watches for Men', value: 'watches-men' },
    ],
  },
  {
    label: 'Women',
    items: [
      { label: "Women's Shoes", value: 'womens-shoes' },
      { label: 'Watches for Women', value: 'watches-women' },
    ],
  },
  {
    label: 'Accessories',
    items: [
      { label: 'Sunglasses', value: 'sunglasses' },
      { label: 'Watches for Men', value: 'watches-men' },
      { label: 'Watches for Women', value: 'watches-women' },
    ],
  },
];
const shopHref = (value) => `/shop?categories=${value}`;

export default function Nav() {
  const { count } = useCart();
  const { customer } = useCustomer();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const headerRef = useRef(null);
  // The header is sticky, not fixed — before the page scrolls past the
  // AnnouncementBar above it, the header sits lower than the viewport top,
  // so the mobile drawer can't assume a hardcoded offset. Track the header's
  // actual bottom edge instead, so the drawer never renders under it.
  const [drawerTop, setDrawerTop] = useState(64);

  useEffect(() => {
    const updateDrawerTop = () => {
      if (headerRef.current) setDrawerTop(headerRef.current.getBoundingClientRect().bottom);
    };
    updateDrawerTop();
    window.addEventListener('scroll', updateDrawerTop, { passive: true });
    window.addEventListener('resize', updateDrawerTop);
    return () => {
      window.removeEventListener('scroll', updateDrawerTop);
      window.removeEventListener('resize', updateDrawerTop);
    };
  }, []);

  const close = () => setMenuOpen(false);

  return (
    <>
      <header ref={headerRef} className="sticky top-0 z-50 border-b border-hairline bg-base/90 backdrop-blur">
        <nav
          className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-6 lg:px-16"
          role="navigation"
          aria-label="Main navigation"
        >
          {/* Brand. */}
          <Link to="/" onClick={close} className="flex items-center gap-2 md:gap-3">
            <img src="/brand/vancito-logo.png" alt="" className="h-7 w-7 object-contain md:h-9 md:w-9" aria-hidden="true" />
            <span className="font-display text-base font-bold uppercase tracking-[0.08em] text-primary md:text-xl">
              Vancito.co
            </span>
          </Link>

          {/* Center links — desktop only. */}
          <ul className="hidden items-center gap-8 md:flex" role="list">
            {NAV_GROUPS.map((group) => (
              <li key={group.label} className="group relative">
                <button
                  type="button"
                  className="flex items-center gap-1.5 py-5 font-display text-xs font-semibold uppercase tracking-[0.2em] text-primary transition-opacity hover:opacity-60"
                  aria-haspopup="true"
                >
                  {group.label}
                  <CaretDown size={10} weight="bold" aria-hidden="true" />
                </button>
                <div className="invisible absolute left-1/2 top-full z-50 min-w-[220px] -translate-x-1/2 border border-hairline bg-base opacity-0 shadow-sm transition-all duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                  <ul className="flex flex-col py-3" role="list">
                    {group.items.map((item) => (
                      <li key={`${group.label}-${item.value}`}>
                        <Link
                          to={shopHref(item.value)}
                          className="block px-6 py-2.5 font-display text-[11px] font-medium uppercase tracking-[0.15em] text-secondary transition-colors hover:bg-elevated hover:text-primary"
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
            <li>
              <NavLink
                to="/categories"
                className={({ isActive }) =>
                  `py-5 font-display text-xs font-semibold uppercase tracking-[0.2em] transition-opacity hover:opacity-60 ${
                    isActive ? 'text-primary underline underline-offset-8' : 'text-primary'
                  }`
                }
              >
                Categories
              </NavLink>
            </li>
          </ul>

          {/* Actions. */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Search"
              onClick={() => setSearchOpen(true)}
              className="grid h-11 w-11 place-items-center text-primary hover:opacity-60 md:h-9 md:w-9"
            >
              <MagnifyingGlass size={18} weight="regular" />
            </button>

            <Link
              to="/cart"
              aria-label={`Cart, ${count} item${count !== 1 ? 's' : ''}`}
              className="relative grid h-11 w-11 place-items-center text-primary hover:opacity-60 md:h-9 md:w-9"
            >
              <ShoppingBag size={18} weight="regular" />
              {count > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center bg-primary px-1 text-[10px] font-bold leading-none text-base"
                >
                  {count}
                </span>
              )}
            </Link>

            {customer ? (
              <Link
                to="/account"
                aria-label="My account"
                className="hidden h-9 w-9 place-items-center text-acid hover:opacity-80 md:grid"
              >
                <User size={18} weight="regular" />
              </Link>
            ) : (
              <button
                type="button"
                aria-label="Sign in"
                onClick={() => setAuthOpen(true)}
                className="hidden h-9 w-9 place-items-center text-primary hover:opacity-60 md:grid"
              >
                <User size={18} weight="regular" />
              </button>
            )}

            {/* Hidden on mobile — the header row is too tight at phone widths
                to fit brand + 4 action icons, so this lives in the drawer
                below instead. */}
            <div className="hidden md:block">
              <ThemeToggle />
            </div>

            {/* Hamburger — mobile only. */}
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              className="grid h-11 w-11 place-items-center text-primary hover:opacity-60 md:hidden"
            >
              {menuOpen ? <X size={18} weight="regular" /> : <List size={18} weight="regular" />}
            </button>
          </div>
        </nav>
      </header>

      {/* Backdrop. */}
      <div
        aria-hidden="true"
        onClick={close}
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 md:hidden ${
          menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Search modal. */}
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Auth modal. */}
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />

      {/* Drawer panel. */}
      <div
        id="mobile-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        style={{ top: drawerTop }}
        className={`fixed inset-x-0 z-40 border-b border-hairline bg-base transition-transform duration-300 ease-in-out md:hidden ${
          menuOpen ? 'translate-y-0' : '-translate-y-[120%]'
        }`}
      >
        <nav className="flex flex-col px-6 pb-6 pt-2">
          {NAV_GROUPS.map((group) => (
            <MobileGroup key={group.label} group={group} onNavigate={close} />
          ))}
          <Link
            to="/categories"
            onClick={close}
            className="border-b border-hairline py-4 font-display text-sm font-semibold uppercase tracking-[0.2em] text-primary"
          >
            Categories
          </Link>
          <Link
            to="/cart"
            onClick={close}
            className="border-b border-hairline py-4 font-display text-sm font-semibold uppercase tracking-widest text-primary transition-colors hover:text-acid"
          >
            Bag{count > 0 && <span className="ml-2 text-acid">({count})</span>}
          </Link>
          <div className="pt-4">
            {customer ? (
              <Link
                to="/account"
                onClick={close}
                className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-widest text-acid hover:opacity-80"
              >
                <User size={18} weight="regular" />
                Account
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => { close(); setAuthOpen(true); }}
                className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-widest text-primary hover:text-acid"
              >
                <User size={18} weight="regular" />
                Sign In
              </button>
            )}
          </div>
          <div className="flex items-center justify-between border-t border-hairline pt-4 mt-4">
            <span className="font-display text-xs font-semibold uppercase tracking-widest text-secondary">
              Theme
            </span>
            <ThemeToggle />
          </div>
        </nav>
      </div>
    </>
  );
}

function MobileGroup({ group, onNavigate }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-hairline">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between py-4 font-display text-sm font-semibold uppercase tracking-[0.2em] text-primary"
      >
        {group.label}
        <CaretDown size={12} weight="bold" className={`transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <div className="flex flex-col pb-3">
          {group.items.map((item) => (
            <Link
              key={`${group.label}-${item.value}`}
              to={shopHref(item.value)}
              onClick={onNavigate}
              className="py-2.5 pl-4 font-display text-xs font-medium uppercase tracking-[0.15em] text-secondary"
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

