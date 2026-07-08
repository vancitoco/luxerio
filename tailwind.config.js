/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Brand constants — never themed.
        gold: 'var(--brand-gold)',
        sale: 'var(--sale-red)',
        // Legacy accent alias — DOES flip per theme now (see index.css).
        acid: 'var(--brand-acid)',
        // Semantic tokens — flip per theme (see index.css).
        base: 'var(--bg-base)',
        surface: 'var(--bg-surface)',
        elevated: 'var(--bg-elevated)',
        primary: 'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        hairline: 'var(--border-hairline)',
      },
      fontFamily: {
        // Live web type for "Vancito.co" + nav. No text image assets.
        display: ['"Archivo"', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
