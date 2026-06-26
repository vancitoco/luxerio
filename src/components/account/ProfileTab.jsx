import { useState, useEffect } from 'react';
import { useCustomer } from '../../context/CustomerContext.jsx';

export default function ProfileTab() {
  const { customer, updateProfile, loading } = useCustomer();
  const [fields, setFields] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (customer) {
      setFields({
        firstName: customer.firstName ?? '',
        lastName:  customer.lastName  ?? '',
        email:     customer.email     ?? '',
        phone:     customer.phone     ?? '',
      });
    }
  }, [customer]);

  const set = (k) => (e) => setFields((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setMsg(null);
    const result = await updateProfile({
      firstName: fields.firstName,
      lastName:  fields.lastName,
      email:     fields.email,
      phone:     fields.phone || undefined,
    });
    setMsg(result.ok ? { type: 'ok', text: 'Profile updated.' } : { type: 'err', text: result.error });
  };

  return (
    <form onSubmit={submit} className="flex max-w-md flex-col gap-5">
      <div className="flex gap-4">
        <Field label="First name" value={fields.firstName} onChange={set('firstName')} required />
        <Field label="Last name"  value={fields.lastName}  onChange={set('lastName')}  required />
      </div>
      <Field label="Email" type="email" value={fields.email} onChange={set('email')} required />
      <Field label="Phone" type="tel"  value={fields.phone} onChange={set('phone')} placeholder="+1 555 000 0000" />

      {msg && (
        <p className={`font-display text-[10px] uppercase tracking-wider ${msg.type === 'ok' ? 'text-acid' : 'text-red-400'}`}>
          {msg.text}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-primary py-3.5 font-display text-[10px] font-black uppercase tracking-widest text-base transition-colors hover:bg-acid hover:text-black disabled:opacity-40"
      >
        {loading ? '…' : 'Save Changes'}
      </button>
    </form>
  );
}

function Field({ label, ...props }) {
  return (
    <div className="flex flex-1 flex-col gap-1.5">
      <label className="font-display text-[9px] font-black uppercase tracking-widest text-secondary">
        {label}
      </label>
      <input
        {...props}
        className="border border-hairline bg-elevated px-4 py-2.5 font-display text-xs text-primary placeholder:text-secondary focus:border-acid focus:outline-none"
      />
    </div>
  );
}
