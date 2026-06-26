// Temporary scaffold marker — replaced page-by-page in Phases B–E.
export default function PagePlaceholder({ title, phase, blurb }) {
  return (
    <section className="mx-auto max-w-[1280px] px-6 py-24 lg:px-16">
      <span className="inline-block bg-acid px-2 py-1 font-display text-[10px] font-bold uppercase tracking-widest text-black">
        {phase} — placeholder
      </span>
      <h1 className="mt-6 font-display text-6xl font-black uppercase leading-none tracking-tight text-primary md:text-8xl">
        {title}
      </h1>
      <p className="mt-6 max-w-md text-sm uppercase tracking-wider text-secondary">{blurb}</p>
    </section>
  );
}
