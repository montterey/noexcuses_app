/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: {
          50: '#FEF2F2',
          100: '#FEE2E2',
          200: '#FECACA',
          300: '#FCA5A5',
          400: '#F87171',
          DEFAULT: '#E12D2D',
          500: '#E12D2D',
          600: '#B91C1C',
          700: '#991B1B',
          800: '#7F1D1D',
          900: '#450A0A',
        },
        dark: {
          50: '#18181B',
          100: '#121214',
          200: '#0D0D0E',
          300: '#0A0A0B',
          DEFAULT: '#070707',
          400: '#070707',
          500: '#050505',
          600: '#030303',
        },
        surface: {
          DEFAULT: '#121214',
          light: '#18181B',
          lighter: '#202024',
        },
        success: '#22C55E',
        warning: '#F59E0B',
        freeze: '#38BDF8',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Arial Narrow', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'red-soft': '0 0 28px rgba(225, 45, 45, 0.16)',
      },
    },
  },
  plugins: [],
};
