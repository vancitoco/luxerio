/*
  Signature neon-green / black ticker strip. Brand-constant: acid bg + black
  text in BOTH themes. Duplicated content + 50% translate = seamless loop.
*/
export default function GreenStrip({ items = DEFAULT_ITEMS }) {
  const row = [...items, ...items];
  return (
    <div className="overflow-hidden bg-acid select-none" aria-hidden="true">
      <div className="flex w-max animate-ticker whitespace-nowrap py-2">
        {row.map((text, i) => (
          <span
            key={i}
            className="mx-6 font-display text-xs font-bold uppercase tracking-widest text-black"
          >
            {text}
            <span className="mx-6 text-black/40">/</span>
          </span>
        ))}
      </div>
    </div>
  );
}

const DEFAULT_ITEMS = [
  'Limited Edition',
  'Premium Quality Guaranteed',
  'New Drop Live',
  'Technical Apparel',
  'Engineered For Urban Tactics',
];
