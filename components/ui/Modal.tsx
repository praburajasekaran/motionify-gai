/**
 * Modal Component - Full-screen modal wrapper with enterprise-grade animations
 *
 * Provides a reusable modal component with:
 * - Full-screen overlay with backdrop blur
 * - Focus trapping
 * - Escape key to close
 * - Spring-based animations for natural feel
 * - Staggered content appearance
 * - Exit animations
 * - Mobile-optimized slide-up behavior
 * - Accessibility features
 */

import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from './design-system';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'lg',
  showCloseButton = true,
  className,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [shouldRender, setShouldRender] = useState(isOpen);

  // Handle modal visibility with exit animations
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setIsClosing(false);
    } else if (shouldRender) {
      setIsClosing(true);
      // Wait for exit animation to complete before unmounting
      const timer = setTimeout(() => {
        setShouldRender(false);
        setIsClosing(false);
      }, 300); // Match animation duration
      return () => clearTimeout(timer);
    }
  }, [isOpen, shouldRender]);

  // Handle escape key press
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Focus trap - focus first focusable element when modal opens
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      if (firstElement) {
        firstElement.focus();
      }
    }
  }, [isOpen]);

  if (!shouldRender) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    full: 'max-w-[95vw] h-[95vh]',
  };

  // Detect mobile for slide-up animation
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center p-4",
        // Entrance animations
        !isClosing && "animate-in fade-in duration-200",
        // Exit animations
        isClosing && "animate-out fade-out duration-200"
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      {/* Backdrop with enhanced blur transition */}
      <div
        className={cn(
          "absolute inset-0 bg-black/60 backdrop-blur-sm transition-all",
          !isClosing && "animate-in fade-in duration-300",
          isClosing && "animate-out fade-out duration-200"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Content with spring animation */}
      <div
        ref={modalRef}
        className={cn(
          'relative z-10 w-full rounded-2xl bg-card shadow-2xl',
          // Entrance animations - spring timing for natural feel
          !isClosing && isMobile
            ? 'animate-in slide-in-from-bottom-full duration-300 ease-spring'
            : !isClosing
              ? 'animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 ease-spring'
              : '',
          // Exit animations
          isClosing && isMobile
            ? 'animate-out slide-out-to-bottom-full duration-200'
            : isClosing
              ? 'animate-out zoom-out-95 slide-out-to-bottom-4 duration-200'
              : '',
          sizeClasses[size],
          className
        )}
      >
        {/* Header with staggered entrance */}
        {(title || showCloseButton) && (
          <div
            className={cn(
              "flex items-center justify-between border-b border-border px-6 py-4",
              !isClosing && "animate-in slide-in-from-top-2 fade-in duration-300 animation-delay-[100ms]"
            )}
          >
            {title && (
              <h2
                id="modal-title"
                className="text-xl font-bold text-foreground"
              >
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className={cn(
                  "ml-auto rounded-full p-2 text-muted-foreground",
                  "transition-all duration-200",
                  "hover:bg-accent hover:text-foreground hover:scale-110",
                  "active:scale-95",
                  "focus:outline-none focus:ring-2 focus:ring-primary/20"
                )}
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}

        {/* Body with staggered entrance */}
        <div
          className={cn(
            "max-h-[85vh] overflow-y-auto",
            !isClosing && "animate-in fade-in duration-300 animation-delay-[150ms]"
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
};
