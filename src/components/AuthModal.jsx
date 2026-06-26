import { useEffect, useRef, useState } from 'react';
import { useCustomer } from '../context/CustomerContext.jsx';

export default function AuthModal({ open, onClose }) {
  const { login, signup, loading } = useCustomer();
  const [mode, setMode]       = useState('login'); // 'login' | 'signup'
  const [fields, setFields]   = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [err, setErr]         = useState(null);
  const firstRef              = useRef(null);

  useEffect(() => {
    if (open) {
      setErr(null);
      setFields({ firstName: '', lastName: '', email: '', password: '' });
      setMode('login');
      setTimeout(() => firstRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const set = (k) => (e) => setFields((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    const result = mode === 'login'
      ? await login(fields.email, fields.password)
      : await signup(fields.firstName, fields.lastName, fields.email, fields.password);
    if (result.error) { setErr(result.error); return; }
    onClose();
  };

  if (!open) return null;

  return (
    <>
      <div aria-hidden="true" onClick={onClose} className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'login' ? 'Sign in' : 'Create account'}
        className="fixed inset-x-4 top-1/2 z-50 mx-auto w-full max-w-sm -translate-y-1/2 overflow-hidden border border-hairline bg-base p-8"
      >
        {/* Mode tabs. */}
        <div className="mb-8 flex border-b border-hairline">
          {['login', 'signup'].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setErr(null); }}
              className={`flex-1 pb-3 font-display text-[10px] font-black uppercase tracking-widest transition-colors ${
                mode === m
                  ? 'border-b-2 border-acid text-primary'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              {m === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
          {mode === 'signup' && (
            <div className="grid grid-cols-2 gap-3">
              <Field ref={firstRef} label="First name" value={fields.firstName} onChange={set('firstName')} required />
              <Field label="Last name" value={fields.lastName} onChange={set('lastName')} required />
            </div>
          )}
          <Field
            ref={mode === 'login' ? firstRef : undefined}
            label="Email"
            type="email"
            value={fields.email}
            onChange={set('email')}
            required
          />
          <Field
            label="Password"
            type="password"
            value={fields.password}
            onChange={set('password')}
            required
            minLength={mode === 'signup' ? 5 : undefined}
          />

          {err && (
            <p className="font-display text-[10px] uppercase tracking-wider text-red-400">{err}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full bg-primary py-3.5 font-display text-[10px] font-black uppercase tracking-widest text-base transition-colors hover:bg-acid hover:text-black disabled:opacity-40"
          >
            {loading ? '…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center text-secondary hover:text-primary"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </>
  );
}

import { forwardRef } from 'react';
const Field = forwardRef(function Field({ label, ...props }, ref) {
  return (
    <div className="flex flex-1 flex-col gap-1.5">
      <label className="font-display text-[9px] font-black uppercase tracking-widest text-secondary">
        {label}
      </label>
      <input
        ref={ref}
        {...props}
        className="border border-hairline bg-elevated px-4 py-2.5 font-display text-xs text-primary placeholder:text-secondary focus:border-acid focus:outline-none"
      />
    </div>
  );
});
