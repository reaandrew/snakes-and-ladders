/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        game: {
          primary: '#3B82F6',
          secondary: '#10B981',
          accent: '#F59E0B',
          danger: '#EF4444',
        },
      },
      animation: {
        'bounce-slow': 'bounce 2s infinite',
        'pulse-glow': 'pulse-glow 2s infinite',
        'gradient-shift': 'gradient-shift 15s ease infinite',
        'dice-spin': 'dice-spin 0.8s ease-out forwards',
        'confetti-fall': 'confetti-fall 3s ease-in-out infinite',
        'confetti-shake': 'confetti-shake 0.5s ease-in-out infinite',
        'winner-bounce': 'winner-bounce 0.6s ease-out',
        'snake-wiggle': 'snake-wiggle 2s ease-in-out infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': {
            boxShadow: '0 0 5px rgba(59, 130, 246, 0.5)',
          },
          '50%': {
            boxShadow: '0 0 20px rgba(59, 130, 246, 0.8)',
          },
        },
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'dice-spin': {
          '0%': { transform: 'rotateX(0) rotateY(0)' },
          '100%': { transform: 'var(--final-rotation, rotateX(0) rotateY(0))' },
        },
        'confetti-fall': {
          '0%': { transform: 'translateY(-100vh) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(100vh) rotate(720deg)', opacity: '0' },
        },
        'confetti-shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px)' },
          '75%': { transform: 'translateX(5px)' },
        },
        'winner-bounce': {
          '0%': { transform: 'scale(0.5)', opacity: '0' },
          '50%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'snake-wiggle': {
          '0%, 100%': { transform: 'rotate(-2deg)' },
          '50%': { transform: 'rotate(2deg)' },
        },
      },
    },
  },
  plugins: [],
};
