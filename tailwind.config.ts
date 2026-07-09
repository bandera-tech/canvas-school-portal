import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#172033',
        canvas: '#f5f7fb',
        brand: '#3454d1',
        mint: '#20a779',
      },
    },
  },
  plugins: [],
} satisfies Config;
