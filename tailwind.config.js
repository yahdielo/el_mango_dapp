/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        primary: {
          DEFAULT: 'hsl(107 97% 49%)',
          foreground: 'hsl(0 0% 0%)',
        },
        accent: 'hsl(107 97% 49%)',
      },
      fontFamily: {
        afacad: ['Afacad', 'sans-serif'],
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '15%':       { transform: 'translateX(-6px)' },
          '30%':       { transform: 'translateX(6px)' },
          '45%':       { transform: 'translateX(-5px)' },
          '60%':       { transform: 'translateX(5px)' },
          '75%':       { transform: 'translateX(-3px)' },
          '90%':       { transform: 'translateX(3px)' },
        },
      },
      animation: {
        shake: 'shake 0.55s ease-in-out',
      },
    },
  },
  plugins: [],
};
