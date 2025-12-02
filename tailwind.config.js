/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./features/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      // Custom shadow system - enterprise-grade elevation
      boxShadow: {
        'sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'DEFAULT': '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        'md': '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1)',
        'xl': '0 20px 25px -5px rgb(0 0 0 / 0.1)',
        '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        // Colored shadows for specific contexts
        'primary-sm': '0 1px 3px 0 rgb(59 130 246 / 0.1)',
        'primary-md': '0 4px 12px -2px rgb(59 130 246 / 0.15)',
        'success-sm': '0 1px 3px 0 rgb(16 185 129 / 0.1)',
        'success-md': '0 4px 12px -2px rgb(16 185 129 / 0.15)',
        'none': 'none',
      },

      // Refined color palette with tints and shades
      colors: {
        // Keep existing Tailwind colors, add custom refinements
        neutral: {
          50: '#fafafa',
          100: '#f4f4f5',
          200: '#e4e4e7',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#52525b',
          700: '#3f3f46',
          800: '#27272a',
          900: '#18181b',
        },
      },

      // Calibrated typography scale
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1.2' }],
      },

      // Refined transitions with better timing functions
      transitionDuration: {
        fast: '150ms',
        DEFAULT: '200ms',
        slow: '300ms',
        slower: '500ms',
      },

      transitionTimingFunction: {
        'ease-out': 'cubic-bezier(0, 0, 0.2, 1)',
        'ease-in': 'cubic-bezier(0.4, 0, 1, 1)',
        'ease-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },

      // Animation refinements
      animation: {
        'fade-in': 'fadeIn 200ms ease-out',
        'fade-in-up': 'fadeInUp 300ms ease-out',
        'scale-in': 'scaleIn 200ms ease-out',
        'slide-in-right': 'slideInRight 250ms ease-out',
        'spin-slow': 'spin 3s linear infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },

      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },

      // Z-index scale for consistent layering
      zIndex: {
        'dropdown': '10',
        'sticky': '20',
        'modal': '30',
        'popover': '40',
        'tooltip': '50',
      },

      // Animation delays for staggered animations
      animationDelay: {
        '0': '0ms',
        '75': '75ms',
        '100': '100ms',
        '150': '150ms',
        '200': '200ms',
        '300': '300ms',
        '400': '400ms',
        '500': '500ms',
        '700': '700ms',
        '1000': '1000ms',
      },
    },
  },
  plugins: [
    // Plugin to enable animation-delay utilities
    function({ matchUtilities, theme }) {
      matchUtilities(
        {
          'animation-delay': (value) => {
            return {
              'animation-delay': value,
            }
          },
        },
        {
          values: theme('animationDelay'),
        }
      )
    },
  ],
}
