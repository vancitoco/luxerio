import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SearchModal({ open, onClose }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Focus input when opened.
  useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // ESC to close.
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Lock body scroll.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const submit = (e) => {
    e?.preventDefault();
    const q = query.trim();
    if (!q) return;
    navigate(`/shop?q=${encodeURIComponent(q)}`);
    onClose();
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop. */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
      />

      {/* Panel. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        className="fixed inset-x-0 top-0 z-50 border-b border-hairline bg-base px-6 py-8 lg:px-16"
      >
        <form onSubmit={submit} className="mx-auto flex max-w-[1280px] items-center gap-4">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 text-secondary" aria-hidden="true">
            <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
          </svg>

          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search field gear…"
            aria-label="Search products"
            className="flex-1 bg-transparent font-display text-2xl font-black uppercase tracking-tight text-primary placeholder:text-secondary/40 focus:outline-none md:text-3xl"
          />

          {query && (
            <button
              type="submit"
              className="shrink-0 bg-acid px-5 py-2 font-display text-[10px] font-black uppercase tracking-widest text-black transition-opacity hover:opacity-80"
            >
              Search
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="shrink-0 grid h-9 w-9 place-items-center text-secondary transition-colors hover:text-primary"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </form>

        <p className="mx-auto mt-4 max-w-[1280px] font-display text-[9px] uppercase tracking-widest text-secondary">
          Press ESC to close · Enter to search
        </p>
      </div>
    </>
  );
}
