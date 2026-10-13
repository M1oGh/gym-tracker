/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    // Editorial look: square corners and flat surfaces everywhere (only true circles stay round).
    borderRadius: { none: '0', DEFAULT: '0', sm: '0', md: '0', lg: '0', xl: '0', '2xl': '0', '3xl': '0', full: '9999px' },
    boxShadow: { none: 'none', DEFAULT: 'none', sm: 'none', md: 'none', lg: 'none', xl: 'none', '2xl': 'none' },
    extend: {
      colors: {
        bg: 'rgb(var(--bg) / <alpha-value>)',
        frame: 'rgb(var(--frame) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        surface2: 'rgb(var(--surface2) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        fg: 'rgb(var(--fg) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        'accent-fg': 'rgb(var(--accent-fg) / <alpha-value>)',
        success: 'rgb(var(--success) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['"Inter Tight"', '-apple-system', 'system-ui', 'sans-serif'],
        display: ['"Big Shoulders Display"', 'Impact', 'sans-serif'],
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
