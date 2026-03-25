/**
 * Motionify Logo - Geometric & Modern Design
 *
 * Design Concept:
 * - Three overlapping frames representing video frames in motion
 * - Progressive offset creates sense of movement and animation
 * - Clean geometric shapes with rounded corners for modern feel
 * - Vibrant blue (Motion Blue) as primary brand color
 *
 * Logo Philosophy:
 * The logo represents the core of video production: frames in motion.
 * The layered frames symbolize:
 * 1. Collaboration (multiple perspectives)
 * 2. Progress (forward movement)
 * 3. Quality (multiple layers of refinement)
 */

import React from 'react';
import { cn } from '../ui/design-system';

export interface LogoProps {
  /**
   * Logo variant to display
   * - full: Icon + wordmark (default)
   * - icon: Icon only
   * - wordmark: Text only
   */
  variant?: 'full' | 'icon' | 'wordmark';

  /**
   * Size preset
   * - sm: 24px icon, 16px text
   * - md: 32px icon, 20px text
   * - lg: 48px icon, 28px text
   * - xl: 64px icon, 36px text
   */
  size?: 'sm' | 'md' | 'lg' | 'xl';

  /**
   * Color scheme
   * - color: Full brand colors (default)
   * - mono-dark: Black logo for light backgrounds
   * - mono-light: White logo for dark backgrounds
   */
  colorScheme?: 'color' | 'mono-dark' | 'mono-light';

  /**
   * Additional className
   */
  className?: string;

  /**
   * Show animation on hover
   */
  animated?: boolean;
}

const sizeMap = {
  sm: { icon: 24, text: 16, gap: 8 },
  md: { icon: 32, text: 20, gap: 12 },
  lg: { icon: 48, text: 28, gap: 16 },
  xl: { icon: 64, text: 36, gap: 20 },
};

/**
 * Logo Icon Component
 * Three overlapping frames creating motion effect
 */
const LogoIcon: React.FC<{
  size: number;
  colorScheme: 'color' | 'mono-dark' | 'mono-light';
  animated?: boolean;
}> = ({ size, colorScheme, animated = false }) => {
  const getColors = () => {
    switch (colorScheme) {
      case 'mono-dark':
        return {
          frame1: '#18181B',
          frame2: '#27272A',
          frame3: '#3F3F46',
        };
      case 'mono-light':
        return {
          frame1: '#FFFFFF',
          frame2: '#F4F4F5',
          frame3: '#E4E4E7',
        };
      case 'color':
      default:
        return {
          frame1: '#3B82F6', // Motion Blue 500
          frame2: '#60A5FA', // Motion Blue 400
          frame3: '#93C5FD', // Motion Blue 300
        };
    }
  };

  const colors = getColors();

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(
        "shrink-0",
        animated && "transition-transform duration-300 ease-spring group-hover:scale-110"
      )}
    >
      {/* Frame 3 - Background layer (lightest) */}
      <rect
        x="16"
        y="16"
        width="40"
        height="40"
        rx="8"
        fill={colors.frame3}
        className={cn(animated && "transition-all duration-300 group-hover:translate-x-1 group-hover:translate-y-1")}
      />

      {/* Frame 2 - Middle layer */}
      <rect
        x="12"
        y="12"
        width="40"
        height="40"
        rx="8"
        fill={colors.frame2}
        className={cn(animated && "transition-all duration-200 group-hover:translate-x-0.5 group-hover:translate-y-0.5")}
      />

      {/* Frame 1 - Foreground layer (darkest/primary) */}
      <rect
        x="8"
        y="8"
        width="40"
        height="40"
        rx="8"
        fill={colors.frame1}
      />

      {/* Play icon inside front frame - subtle detail */}
      <path
        d="M26 24L34 28L26 32V24Z"
        fill="white"
        opacity="0.9"
        className={cn(animated && "transition-all duration-200 group-hover:translate-x-0.5")}
      />
    </svg>
  );
};

/**
 * Logo Wordmark Component
 */
const LogoWordmark: React.FC<{
  size: number;
  colorScheme: 'color' | 'mono-dark' | 'mono-light';
}> = ({ size, colorScheme }) => {
  const textColor = colorScheme === 'mono-light' ? 'text-white' : 'text-neutral-900';

  return (
    <span
      className={cn(
        "font-bold tracking-tight",
        textColor
      )}
      style={{ fontSize: `${size}px`, lineHeight: 1 }}
    >
      Motionify
    </span>
  );
};

/**
 * Main Logo Component
 */
export const MotionifyLogo: React.FC<LogoProps> = ({
  variant = 'full',
  size = 'md',
  colorScheme = 'color',
  className,
  animated = false,
}) => {
  const sizes = sizeMap[size];

  if (variant === 'icon') {
    return (
      <div className={cn("inline-flex items-center", animated && "group", className)}>
        <LogoIcon size={sizes.icon} colorScheme={colorScheme} animated={animated} />
      </div>
    );
  }

  if (variant === 'wordmark') {
    return (
      <div className={cn("inline-flex items-center", className)}>
        <LogoWordmark size={sizes.text} colorScheme={colorScheme} />
      </div>
    );
  }

  // Full logo (icon + wordmark)
  return (
    <div
      className={cn(
        "inline-flex items-center",
        animated && "group cursor-pointer",
        className
      )}
      style={{ gap: `${sizes.gap}px` }}
    >
      <LogoIcon size={sizes.icon} colorScheme={colorScheme} animated={animated} />
      <LogoWordmark size={sizes.text} colorScheme={colorScheme} />
    </div>
  );
};

/**
 * Logo Usage Examples:
 *
 * // Full logo with animation
 * <MotionifyLogo size="lg" animated />
 *
 * // Icon only for navigation
 * <MotionifyLogo variant="icon" size="md" />
 *
 * // Wordmark for tight spaces
 * <MotionifyLogo variant="wordmark" size="sm" />
 *
 * // Monochrome for dark backgrounds
 * <MotionifyLogo colorScheme="mono-light" />
 *
 * // Custom styling
 * <MotionifyLogo className="opacity-80 hover:opacity-100" />
 */
