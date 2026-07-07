import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { MagnifyingGlass, ShoppingBag, User, List, X } from '@phosphor-icons/react';
import { useCart } from '../context/CartContext.jsx';
import { useCustomer } from '../context/CustomerContext.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import SearchModal from './SearchModal.jsx';
import AuthModal from './AuthModal.jsx';

const LINKS = [
  { label: 'Home',       to: '/' },
  { label: 'Shop',       to: '/shop' },
  { label: 'Categories', to: '/categories' },
];

export default function Nav() {
  const { count } = useCart();
  const { customer } = useCustomer();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  const close = () => setMenuOpen(false);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-hairline bg-base/90 backdrop-blur">
        <nav
          className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-6 lg:px-16"
          role="navigation"
          aria-label="Main navigation"
        >
          {/* Brand. */}
          <Link to="/" onClick={close} className="flex items-center gap-3">
            <img src="/brand/vancito-logo.png" alt="" className="h-9 w-9 object-contain" aria-hidden="true" />
            <span className="font-display text-xl font-extrabold uppercase tracking-tight text-primary">
              Vancito.co
            </span>
          </Link>

          {/* Center links — desktop only. */}
          <ul className="hidden items-center gap-8 md:flex" role="list">
            {LINKS.map((l) => (
              <li key={l.label}>
                <NavLink
                  to={l.to}
                  className={({ isActive }) =>
                    `font-display text-xs font-bold uppercase tracking-widest transition-colors hover:text-acid ${
                      isActive ? 'text-acid' : 'text-secondary'
                    }`
                  }
                >
                  {l.label}
                </NavLink>
              </li>
            ))}
          </ul>

          {/* Actions. */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Search"
              onClick={() => setSearchOpen(true)}
              className="grid h-9 w-9 place-items-center text-primary hover:text-acid"
            >
              <MagnifyingGlass size={18} weight="regular" />
            </button>

            <Link
              to="/cart"
              aria-label={`Cart, ${count} item${count !== 1 ? 's' : ''}`}
              className="relative grid h-9 w-9 place-items-center text-primary hover:text-acid"
            >
              <ShoppingBag size={18} weight="regular" />
              {count > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center bg-acid px-1 text-[10px] font-bold text-black"
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
                className="hidden h-9 w-9 place-items-center text-primary hover:text-acid md:grid"
              >
                <User size={18} weight="regular" />
              </button>
            )}

            <ThemeToggle />

            {/* Hamburger — mobile only. */}
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              className="grid h-9 w-9 place-items-center text-primary hover:text-acid md:hidden"
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
        className={`fixed inset-x-0 top-16 z-40 border-b border-hairline bg-base transition-transform duration-300 ease-in-out md:hidden ${
          menuOpen ? 'translate-y-0' : '-translate-y-[120%]'
        }`}
      >
        <nav className="flex flex-col px-6 pb-6 pt-2">
          {LINKS.map((l) => (
            <NavLink
              key={l.label}
              to={l.to}
              onClick={close}
              className={({ isActive }) =>
                `border-b border-hairline py-4 font-display text-sm font-black uppercase tracking-widest transition-colors hover:text-acid ${
                  isActive ? 'text-acid' : 'text-primary'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
          <Link
            to="/cart"
            onClick={close}
            className="border-b border-hairline py-4 font-display text-sm font-black uppercase tracking-widest text-primary transition-colors hover:text-acid"
          >
            Bag{count > 0 && <span className="ml-2 text-acid">({count})</span>}
          </Link>
          <div className="pt-4">
            {customer ? (
              <Link
                to="/account"
                onClick={close}
                className="flex items-center gap-2 font-display text-sm font-black uppercase tracking-widest text-acid hover:opacity-80"
              >
                <User size={18} weight="regular" />
                Account
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => { close(); setAuthOpen(true); }}
                className="flex items-center gap-2 font-display text-sm font-black uppercase tracking-widest text-primary hover:text-acid"
              >
                <User size={18} weight="regular" />
                Sign In
              </button>
            )}
          </div>
        </nav>
      </div>
    </>
  );
}

