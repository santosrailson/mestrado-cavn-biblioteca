/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: 'var(--color-surface)',
          alt: 'var(--color-surface-alt)',
        },
        bg: 'var(--color-bg)',
        text: {
          DEFAULT: 'var(--color-text)',
          muted: 'var(--color-text-muted)',
        },
        border: 'var(--color-border)',
        primary: {
          DEFAULT: 'rgb(var(--color-primary-rgb) / <alpha-value>)',
          contrast: 'var(--color-primary-contrast)',
        },
        focus: 'var(--color-focus)',
        success: {
          DEFAULT: 'var(--color-success)',
          bg: 'var(--color-success-bg)',
          border: 'var(--color-success-border)',
          text: 'var(--color-success-text)',
        },
        warning: {
          DEFAULT: 'var(--color-warning)',
          bg: 'var(--color-warning-bg)',
          border: 'var(--color-warning-border)',
          text: 'var(--color-warning-text)',
        },
        danger: {
          DEFAULT: 'var(--color-danger)',
          bg: 'var(--color-danger-bg)',
          border: 'var(--color-danger-border)',
          text: 'var(--color-danger-text)',
        },
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        cavn: {
          green: '#166534',
          darkGreen: '#14532d',
          gold: '#ca8a04',
          lightGold: '#facc15',
        },
        ufpb: {
          blue: '#003366',
          red: '#cc0000',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        serif: ['Merriweather', 'Georgia', 'serif'],
      },
      fontSize: {
        'accessibility-sm': ['var(--font-size-sm)', { lineHeight: '1.5' }],
        'accessibility-base': ['var(--font-size-base)', { lineHeight: '1.6' }],
        'accessibility-lg': ['var(--font-size-lg)', { lineHeight: '1.6' }],
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
