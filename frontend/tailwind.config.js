/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0B1F3A',
          deep: '#0A2540',
          ink: '#071526',
        },
        accent: {
          DEFAULT: '#2F80ED',
          soft: '#E8F1FF',
          mid: '#93C5FD',
          glow: '#67E8F9',
        },
        muted: '#627D98',
        line: '#D9E2EC',
      },
      fontFamily: {
        sans: ['Manrope', 'Inter', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        kiosk: '520px',
      },
      minHeight: {
        touch: '52px',
      },
      boxShadow: {
        kiosk: '0 18px 40px rgba(11, 31, 58, 0.12)',
        ai: '0 0 0 1px rgba(103, 232, 249, 0.28), 0 10px 28px rgba(47, 128, 237, 0.28)',
        'ai-soft': '0 0 24px rgba(125, 211, 252, 0.35)',
      },
    },
  },
  plugins: [],
};
