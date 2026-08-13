/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Kanit', 'Noto Sans Thai', 'system-ui', 'sans-serif'],
        display: ['Mitr', 'Kanit', 'Noto Sans Thai', 'system-ui', 'sans-serif'],
      },
      colors: {
        night: {
          900: '#0b1026',
          800: '#131a3a',
          700: '#1c2550',
          600: '#273268',
          500: '#36427f',
        },
        arcane: {
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
        },
        gold: {
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
        leaf: {
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
        },
        ember: {
          400: '#fb7185',
          500: '#f43f5e',
          600: '#e11d48',
          700: '#be123c',
        },
        sky: {
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
        },
      },
      boxShadow: {
        card: '0 10px 30px -12px rgba(6, 10, 30, 0.55)',
        glow: '0 0 24px -4px rgba(167, 139, 250, 0.65)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
}
