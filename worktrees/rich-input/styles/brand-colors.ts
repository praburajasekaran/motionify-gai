/**
 * Motionify Brand Color System
 *
 * Signature Brand Color: "Motion Blue" - A vibrant, energetic blue representing
 * movement, creativity, and professional production quality.
 *
 * Philosophy: Combines the trust and professionalism of blue with the energy
 * of creative production. This color is intentionally vibrant to stand out in
 * the video production space while maintaining enterprise credibility.
 */

export const brandColors = {
  /**
   * Motion Blue - Primary Brand Color
   * Base: Vibrant blue (#3B82F6) - Tailwind Blue 500
   *
   * Use Cases:
   * - Primary CTAs and interactive elements
   * - Brand presence (logo, primary nav)
   * - Key information and status indicators
   * - Focus states and active selections
   */
  motion: {
    50: '#EFF6FF',   // Lightest - backgrounds, subtle highlights
    100: '#DBEAFE',  // Very light - hover states, badges
    200: '#BFDBFE',  // Light - disabled states, secondary backgrounds
    300: '#93C5FD',  // Medium light - borders, dividers
    400: '#60A5FA',  // Medium - secondary CTAs, icons
    500: '#3B82F6',  // BASE - Primary brand color
    600: '#2563EB',  // Medium dark - hover states for primary buttons
    700: '#1D4ED8',  // Dark - pressed states, emphasis
    800: '#1E40AF',  // Very dark - text on light backgrounds
    900: '#1E3A8A',  // Darkest - headings, high contrast text
    950: '#172554',  // Ultra dark - maximum contrast
  },

  /**
   * Creative Purple - Secondary Brand Color
   * Represents creativity, innovation, and premium quality
   *
   * Use Cases:
   * - Accent color for creative features
   * - Gradients with Motion Blue
   * - Premium/pro tier indicators
   * - Spotlight moments and celebrations
   */
  creative: {
    50: '#FAF5FF',
    100: '#F3E8FF',
    200: '#E9D5FF',
    300: '#D8B4FE',
    400: '#C084FC',
    500: '#A855F7',  // BASE
    600: '#9333EA',
    700: '#7E22CE',
    800: '#6B21A8',
    900: '#581C87',
    950: '#3B0764',
  },

  /**
   * Success Green - Positive Actions & Completion
   * Fresh, energetic green for approvals and completions
   *
   * Use Cases:
   * - Approval buttons and success states
   * - Completed deliverables
   * - Positive metrics and trends
   * - Success notifications
   */
  success: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    200: '#BBF7D0',
    300: '#86EFAC',
    400: '#4ADE80',
    500: '#22C55E',  // BASE
    600: '#16A34A',
    700: '#15803D',
    800: '#166534',
    900: '#14532D',
    950: '#052E16',
  },

  /**
   * Amber Warning - Attention & Pending States
   * Warm, energetic amber for reviews and attention
   *
   * Use Cases:
   * - Pending review states
   * - Important notifications
   * - Revision requests
   * - Attention-needed indicators
   */
  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',  // BASE
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
    950: '#451A03',
  },

  /**
   * Neutral Grays - Foundation Colors
   * Sophisticated zinc-based grays for UI foundation
   *
   * Use Cases:
   * - Text hierarchy
   * - Borders and dividers
   * - Backgrounds and surfaces
   * - Disabled states
   */
  neutral: {
    50: '#FAFAFA',
    100: '#F4F4F5',
    200: '#E4E4E7',
    300: '#D4D4D8',
    400: '#A1A1AA',
    500: '#71717A',  // BASE
    600: '#52525B',
    700: '#3F3F46',
    800: '#27272A',
    900: '#18181B',
    950: '#09090B',
  },
} as const;

/**
 * Brand Gradients - Signature gradient combinations
 * Use these for hero sections, CTAs, and brand moments
 */
export const brandGradients = {
  // Primary brand gradient - Motion Blue to Creative Purple
  primary: 'linear-gradient(135deg, #3B82F6 0%, #A855F7 100%)',
  primarySubtle: 'linear-gradient(135deg, #EFF6FF 0%, #FAF5FF 100%)',

  // Energetic gradient - Warm and inviting
  energetic: 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 50%, #93C5FD 100%)',

  // Success gradient - Approvals and completions
  success: 'linear-gradient(135deg, #22C55E 0%, #4ADE80 100%)',

  // Premium gradient - For pro features
  premium: 'linear-gradient(135deg, #1E40AF 0%, #7E22CE 100%)',

  // Mesh gradient - For backgrounds
  mesh: 'radial-gradient(at 40% 20%, #EFF6FF 0px, transparent 50%), radial-gradient(at 80% 0%, #FAF5FF 0px, transparent 50%), radial-gradient(at 0% 50%, #DBEAFE 0px, transparent 50%)',
} as const;

/**
 * Semantic Color Mapping
 * Maps brand colors to semantic use cases
 */
export const semanticColors = {
  // Primary actions
  primary: brandColors.motion[500],
  primaryHover: brandColors.motion[600],
  primaryActive: brandColors.motion[700],
  primarySubtle: brandColors.motion[50],

  // Accent and highlights
  accent: brandColors.creative[500],
  accentHover: brandColors.creative[600],
  accentSubtle: brandColors.creative[50],

  // Status colors
  success: brandColors.success[500],
  successSubtle: brandColors.success[50],
  warning: brandColors.warning[500],
  warningSubtle: brandColors.warning[50],

  // Text colors
  textPrimary: brandColors.neutral[900],
  textSecondary: brandColors.neutral[600],
  textMuted: brandColors.neutral[400],

  // Border colors
  border: brandColors.neutral[200],
  borderHover: brandColors.neutral[300],

  // Background colors
  background: '#FFFFFF',
  backgroundSubtle: brandColors.neutral[50],
  backgroundMuted: brandColors.neutral[100],
} as const;

/**
 * Brand Color Usage Guidelines
 *
 * DO:
 * - Use Motion Blue (500) for primary actions and brand presence
 * - Use Motion Blue (50-200) for subtle backgrounds and hover states
 * - Use Creative Purple for accent moments and premium features
 * - Use Success Green for approvals and positive actions
 * - Use Amber Warning for attention and pending states
 * - Use Neutral grays for text, borders, and UI foundation
 *
 * DON'T:
 * - Don't use multiple brand colors at equal weight
 * - Don't use pure black (#000000) - use neutral-900 instead
 * - Don't use Motion Blue for destructive actions - use a red variant
 * - Don't mix gradients excessively - one gradient per major section
 * - Don't use colors below 50 or above 950 - they lack accessibility
 *
 * ACCESSIBILITY:
 * - Motion Blue 500 on white: AA compliant for large text
 * - Motion Blue 700 on white: AAA compliant for body text
 * - Always test color contrast ratios for text
 * - Provide non-color indicators for status (icons, labels)
 */

export type BrandColor = keyof typeof brandColors;
export type BrandColorShade = keyof typeof brandColors.motion;
