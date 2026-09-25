/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sage: {
          50: '#f4f8f5',
          100: '#eaf2ec',
          150: '#e2ece5',
          200: '#dbe7df',
          300: '#c8dad0',
          400: '#9cb5a5',
          500: '#6f8f7d',
          600: '#527160',
          700: '#3c5547',
          800: '#2c3e34',
          900: '#1d2a23',
        },
        forest: {
          50: '#f2f8f4',
          100: '#deefe3',
          200: '#bedec8',
          300: '#94c5a5',
          400: '#64a47d',
          500: '#40875c',
          600: '#2f6c48',
          700: '#26563a',
          800: '#204530',
          900: '#1a3828',
          950: '#0c1f15',
        },
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        soft: '0 2px 12px -2px rgba(24, 51, 36, 0.06), 0 1px 3px 0 rgba(24, 51, 36, 0.04)',
        card: '0 4px 20px -4px rgba(24, 51, 36, 0.08)',
        float: '0 12px 32px -6px rgba(24, 51, 36, 0.12)',
      },
      borderRadius: {
        '2.5xl': '1.25rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
};
