/**
 * Design Tokens - Centralized design system values
 * Following enterprise standards (Linear, Notion, Figma)
 */

export const designTokens = {
  /**
   * Shadow System - 4 levels of elevation
   * Enterprise standard: Minimal, consistent, purposeful
   */
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
    // Special shadows with color tints for specific use cases
    primary: {
      sm: '0 1px 3px 0 rgb(59 130 246 / 0.1)',
      md: '0 4px 12px -2px rgb(59 130 246 / 0.15)',
    },
    success: {
      sm: '0 1px 3px 0 rgb(16 185 129 / 0.1)',
      md: '0 4px 12px -2px rgb(16 185 129 / 0.15)',
    },
  },

  /**
   * Spacing System - Consistent padding and margins
   * 4px base unit (1 = 4px)
   */
  spacing: {
    0: '0',
    1: '0.25rem',  // 4px
    2: '0.5rem',   // 8px
    3: '0.75rem',  // 12px
    4: '1rem',     // 16px
    5: '1.25rem',  // 20px
    6: '1.5rem',   // 24px
    8: '2rem',     // 32px
    10: '2.5rem',  // 40px
    12: '3rem',    // 48px
    16: '4rem',    // 64px
  },

  /**
   * Typography System - Calibrated font sizes and line heights
   * Custom scale for optical balance
   */
  typography: {
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1rem' }],      // 12px / 16px
      sm: ['0.875rem', { lineHeight: '1.25rem' }],  // 14px / 20px
      base: ['1rem', { lineHeight: '1.5rem' }],     // 16px / 24px
      lg: ['1.125rem', { lineHeight: '1.75rem' }],  // 18px / 28px
      xl: ['1.25rem', { lineHeight: '1.75rem' }],   // 20px / 28px
      '2xl': ['1.5rem', { lineHeight: '2rem' }],    // 24px / 32px
      '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px / 36px
      '4xl': ['2.25rem', { lineHeight: '2.5rem' }], // 36px / 40px
      '5xl': ['3rem', { lineHeight: '1.2' }],       // 48px
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    letterSpacing: {
      tight: '-0.025em',
      normal: '0',
      wide: '0.025em',
      wider: '0.05em',
    },
  },

  /**
   * Color System - Refined palette with tints and shades
   * Moving beyond basic Tailwind defaults
   */
  colors: {
    // Primary brand color (can be customized in Phase 2)
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',  // Base
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },

    // Neutral palette - refined zinc with custom tints
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

    // Semantic colors with refined shades
    success: {
      50: '#f0fdf4',
      100: '#dcfce7',
      500: '#10b981',
      600: '#059669',
      700: '#047857',
    },
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
    },
    error: {
      50: '#fef2f2',
      100: '#fee2e2',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
    },
  },

  /**
   * Border Radius - Consistent corner treatments
   */
  borderRadius: {
    sm: '0.25rem',   // 4px
    md: '0.375rem',  // 6px
    lg: '0.5rem',    // 8px
    xl: '0.75rem',   // 12px
    '2xl': '1rem',   // 16px
    full: '9999px',
  },

  /**
   * Transitions - Refined timing and easing
   */
  transitions: {
    duration: {
      fast: '150ms',
      base: '200ms',
      slow: '300ms',
      slower: '500ms',
    },
    timing: {
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    },
  },

  /**
   * Z-Index Scale - Consistent layering
   */
  zIndex: {
    base: 0,
    dropdown: 10,
    sticky: 20,
    modal: 30,
    popover: 40,
    tooltip: 50,
  },
} as const;

export type DesignTokens = typeof designTokens;
