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
          50: '#FFFDF9',
          100: '#FAF5EC',
          200: '#F2E8D8',
        },
        sage: {
          50: '#EEF8F3',
          100: '#D7EFE3',
          200: '#B0DFCA',
          500: '#2E8B67',
          600: '#226F51',
          700: '#19543D',
          900: '#103325',
        },
        peach: {
          50: '#FFF4EE',
          100: '#FFE4D4',
          200: '#FFC8AA',
          500: '#D9633B',
          600: '#B84D28',
          800: '#6E2A14',
        },
        berry: {
          50: '#FDF1F4',
          100: '#FADCE4',
          600: '#B4385A',
          800: '#6E1D34',
        },
        ink: {
          900: '#14241D',
          700: '#2E433A',
          500: '#4E655B',
          300: '#9BB0A6',
        },
      },
    },
  },
  plugins: [],
};
