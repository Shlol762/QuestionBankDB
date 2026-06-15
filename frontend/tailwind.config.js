/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        academy: {
          50: '#f0f4f8',
          100: '#d9e2ec',
          200: '#bcccdc',
          300: '#9fb3c8',
          400: '#829ab1',
          500: '#627d98',
          600: '#486581',
          700: '#334e68',
          800: '#243b53',
          900: '#102a43',
        },
        neon: {
          blue: {
            400: '#38BDF8',
            500: '#0EA5E9',
            600: '#0284C7'
          },
          fuchsia: {
            400: '#E879F9',
            500: '#D946EF',
            600: '#C026D3'
          },
          emerald: {
            400: '#34D399',
            500: '#10B981',
            600: '#059669'
          },
          red: {
            400: '#F87171',
            500: '#EF4444',
            600: '#DC2626'
          }
        },
        glass: {
          50: 'rgba(255,255,255,0.03)',
          100: 'rgba(255,255,255,0.05)',
          200: 'rgba(255,255,255,0.08)',
          300: 'rgba(255,255,255,0.10)',
          border: 'rgba(255,255,255,0.12)'
        },
        surface: {
          900: '#0A0A0F',
          800: '#111118',
          700: '#1A1A27',
          600: '#22223A',
          500: '#2D2D4A'
        }
      },
      keyframes: {
        redGlow: {
          '0%': { boxShadow: '0 0 20px rgba(239,68,68,0.4)' },
          '100%': { boxShadow: '0 0 40px rgba(239,68,68,0.8)' }
        },
        slideInRight: {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' }
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' }
        }
      },
      animation: {
        'red-glow': 'redGlow 2s ease-in-out infinite alternate',
        'slide-in-right': 'slideInRight 0.3s cubic-bezier(0.4,0,0.2,1)',
        'fade-in': 'fadeIn 0.2s ease-out'
      }
    },
  },
  plugins: [],
}
