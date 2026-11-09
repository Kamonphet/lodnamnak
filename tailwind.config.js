/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Noto Sans Thai"', '"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        cream: {
          50: '#FFFDFB',
          100: '#FFF8F1',
          200: '#F8ECDF',
        },
        sage: {
          50: '#EDFCF5',
          100: '#D3F8E6',
          200: '#A8EECB',
          500: '#1DB974',
          600: '#14965C',
          700: '#0F7346',
          900: '#0A452B',
        },
        peach: {
          50: '#FFF4F0',
          100: '#FFE4DB',
          200: '#FFC7B5',
          500: '#F26444',
          600: '#D94B2B',
          800: '#7C2714',
        },
        berry: {
          50: '#FFF0F5',
          100: '#FFD9E6',
          600: '#CF2E64',
          800: '#7A1638',
        },
        sky: {
          50: '#EFF8FF',
          100: '#D8EEFF',
          500: '#1994F5',
          600: '#0B76CE',
          800: '#0A477A',
        },
        sunny: {
          50: '#FFFBEB',
          100: '#FEF0C7',
          500: '#F59E0B',
          600: '#C87A06',
          800: '#784504',
        },
        ink: {
          900: '#162921',
          700: '#355045',
          500: '#587569',
          300: '#A3BDB2',
        },
      },
    },
  },
  plugins: [],
};
