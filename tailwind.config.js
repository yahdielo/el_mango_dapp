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
    },
  },
  plugins: [],
};
