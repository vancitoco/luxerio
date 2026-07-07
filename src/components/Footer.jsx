import { Link } from 'react-router-dom';

const LINKS = ['Privacy', 'Terms', 'Shipping', 'Stores'];

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-hairline bg-base">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-6 py-10 md:flex-row md:items-center md:justify-between lg:px-16">
        <Link to="/" className="flex items-center gap-3">
          <img src="/brand/vancito-logo.png" alt="Vancito.co" className="h-8 w-8 object-contain" />
          <span className="font-display text-lg font-extrabold uppercase tracking-tight text-primary">
            Vancito.co
          </span>
        </Link>

        <ul className="flex flex-wrap gap-6">
          {LINKS.map((l) => (
            <li key={l}>
              <a href="#" className="font-display text-xs font-bold uppercase tracking-widest text-secondary hover:text-acid">
                {l}
              </a>
            </li>
          ))}
        </ul>

        <p className="text-xs uppercase tracking-wider text-secondary">
          © {new Date().getFullYear()} Vancito.co. All Rights Reserved.
        </p>
      </div>
    </footer>
  );
}
