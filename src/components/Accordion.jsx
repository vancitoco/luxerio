import { useState } from 'react';

export default function Accordion({ items = [] }) {
  const [open, setOpen] = useState(null);

  return (
    <div className="divide-y divide-hairline border-t border-hairline">
      {items.map((item, i) => (
        <div key={i}>
          <button
            type="button"
            onClick={() => setOpen(open === i ? null : i)}
            className="flex w-full items-center justify-between py-4 text-left"
          >
            <span className="font-display text-[11px] font-black uppercase tracking-widest text-primary">
              {item.label}
            </span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              className={`shrink-0 text-secondary transition-transform duration-200 ${open === i ? 'rotate-180' : ''}`}
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          {open === i && (
            <div className="pb-5 text-xs leading-relaxed tracking-wide text-secondary">
              {item.content}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
