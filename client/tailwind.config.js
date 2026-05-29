/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  // Classes used in server/src/utils/htmlTransformer.js output that don't appear
  // in any JSX source file — Tailwind would purge them without this list.
  safelist: [
    // callout containers
    'border-l-4', 'rounded-r-xl', 'my-6',
    'border-blue-500',
    'bg-amber-50', 'border-amber-400',
    'border-red-400',
    'bg-emerald-50', 'border-emerald-200', 'py-5',
    // callout labels
    'mb-1', 'mb-3',
    'text-blue-900', 'text-amber-900', 'text-red-900', 'text-emerald-900',
    // callout body text
    'text-blue-800', 'text-amber-800', 'text-red-800',
    'text-emerald-800',
    // inline code (span → code replacement)
    'text-slate-900',
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#FAFAF8',
        charcoal: {
          DEFAULT: '#1C1C1E',
          600: '#3A3A3C',
          400: '#636366',
          200: '#AEAEB2',
        },
        primary: {
          DEFAULT: '#3B82F6',
          hover: '#2563EB',
          light: '#EFF6FF',
        },
        success: {
          DEFAULT: '#22C55E',
          light: '#F0FDF4',
        },
        accent: {
          DEFAULT: '#F59E0B',
          light: '#FFFBEB',
        },
        danger: {
          DEFAULT: '#EF4444',
          light: '#FEF2F2',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '8px',
        lg: '12px',
        xl: '16px',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'card-hover': '0 4px 12px 0 rgb(0 0 0 / 0.10)',
      },
    },
  },
  plugins: [],
};
