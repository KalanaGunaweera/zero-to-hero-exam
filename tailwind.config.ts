import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        board: { DEFAULT: '#0F3D2E', deep: '#082A1F', line: '#1F5A45' }, // chalkboard green
        ink: '#000000',
        gold: { DEFAULT: '#F5C400', light: '#FFE45C', dark: '#A88300' }, // lightning yellow from the FB cover
        paper: '#F5F8F6',
        slate: { text: '#14231C', muted: '#56665E' },
        danger: '#C0352B',
      },
      fontFamily: {
        display: ['Oswald', '"Noto Sans Sinhala"', 'sans-serif'],
        sans: ['"Noto Sans Sinhala"', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      screens: { xs: '380px' },
    },
  },
  plugins: [],
};
export default config;
