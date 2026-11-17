/** @type {import('tailwindcss').Config} */
// ธีม "ครัวบ้าน": พื้นกระดาษสีครีม หมึกน้ำตาลเข้ม เขียวใบชาเป็นสีหลัก ส้มขมิ้นเป็นสีเน้น
// ชื่อสเกลสีเดิม (sage/peach/berry/sky/sunny/ink/cream) คงไว้ให้ทุกหน้าเปลี่ยนตามได้ทันที
// รายละเอียดอยู่ใน DESIGN.md
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Anuphan', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        // การ์ดไม่เกิน 16px, ปุ่ม/ช่องกรอก 12px
        xl: '0.625rem',
        '2xl': '0.75rem',
        '3xl': '1rem',
      },
      colors: {
        paper: '#F6F0E6',
        line: '#E6DACB',
        cream: {
          50: '#FFFDF9',
          100: '#FBF6EE',
          200: '#F1E7D8',
        },
        // เขียวใบชา (สีหลัก)
        sage: {
          50: '#EEF3EB',
          100: '#DDE8D7',
          200: '#BCD0B3',
          500: '#5E8B5F',
          600: '#47724A',
          700: '#385B3A',
          900: '#213620',
        },
        // ส้มขมิ้น (สีเน้น)
        peach: {
          50: '#FCF2E7',
          100: '#F7E0C9',
          200: '#EEC49E',
          500: '#D9843B',
          600: '#AE5D1E',
          800: '#6E3A12',
        },
        // แดงอิฐ (อันตราย)
        berry: {
          50: '#FBEEEA',
          100: '#F3D4CC',
          600: '#AE4334',
          800: '#6A2419',
        },
        // ฟ้าคราม (น้ำ)
        sky: {
          50: '#EEF3F6',
          100: '#D8E4EC',
          500: '#5B87A6',
          600: '#43698A',
          800: '#28425A',
        },
        // มัสตาร์ด
        sunny: {
          50: '#FAF4E2',
          100: '#F3E5BB',
          500: '#C9992E',
          600: '#9C7518',
          800: '#57410C',
        },
        // หมึกน้ำตาล
        ink: {
          900: '#2A221B',
          700: '#53473C',
          500: '#74665A',
          300: '#B5A898',
        },
      },
    },
  },
  plugins: [],
};
