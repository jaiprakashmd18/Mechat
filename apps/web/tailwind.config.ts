import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#e0ecff',
          200: '#c7dbff',
          300: '#a3c0ff',
          400: '#7a9bff',
          500: '#5b73f5',
          600: '#4751e0',
          700: '#3a3fbb',
          800: '#323696',
          900: '#2d3178',
        },
        surface: {
          light: 'rgba(255, 255, 255, 0.65)',
          dark: 'rgba(17, 19, 34, 0.55)',
        },
      },
      backgroundImage: {
        'app-gradient-light':
          'radial-gradient(circle at 20% 20%, #e9ecff 0%, #f6f8ff 45%, #ffffff 100%)',
        'app-gradient-dark':
          'radial-gradient(circle at 20% 20%, #1b1f3b 0%, #0f1122 45%, #07080f 100%)',
      },
      backdropBlur: {
        xs: '2px',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
        'glass-dark': '0 8px 32px 0 rgba(0, 0, 0, 0.45)',
      },
      keyframes: {
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'slide-up': { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'pulse-dot': { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.3' } },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-up': 'slide-up 0.25s ease-out',
        'pulse-dot': 'pulse-dot 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
