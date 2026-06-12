/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          DEFAULT: '#FF6B35',
          500: '#FF6B35',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        dark: {
          50: '#1a1a1a',
          100: '#151515',
          200: '#121212',
          300: '#0f0f0f',
          DEFAULT: '#0a0a0a',
          400: '#0a0a0a',
          500: '#080808',
          600: '#050505',
        },
        surface: {
          DEFAULT: '#1a1a1a',
          light: '#242424',
          lighter: '#2a2a2a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
