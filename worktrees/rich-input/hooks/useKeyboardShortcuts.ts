/**
 * useKeyboardShortcuts Hook
 *
 * Enterprise-grade keyboard shortcuts system supporting:
 * - Navigation shortcuts (J/K, G+D for go to dashboard)
 * - Action shortcuts (Cmd+Enter, D for delete, A for approve)
 * - UI shortcuts (?, Esc, Tab)
 * - Sequence shortcuts (G then D = go to dashboard)
 * - Context-aware shortcuts (different actions per page)
 */

import { useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export interface KeyboardShortcut {
  key: string;
  modifiers?: ('ctrl' | 'cmd' | 'alt' | 'shift')[];
  description: string;
  action: () => void;
  category: 'navigation' | 'actions' | 'ui' | 'selection';
  enabled?: boolean;
  sequence?: string; // For multi-key sequences like "g d"
}

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
}

/**
 * Custom hook for managing keyboard shortcuts
 */
export const useKeyboardShortcuts = ({
  shortcuts,
  enabled = true,
}: UseKeyboardShortcutsOptions) => {
  const sequenceRef = useRef<string>('');
  const sequenceTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
      const isContentEditable = target.contentEditable === 'true';

      if (isInput || isContentEditable) {
        // Allow Escape to blur input
        if (e.key === 'Escape') {
          target.blur();
        }
        return;
      }

      // Build modifier string
      const hasCtrl = e.ctrlKey || e.metaKey; // metaKey for Mac Cmd
      const hasAlt = e.altKey;
      const hasShift = e.shiftKey;

      // Handle sequence shortcuts (like "g d" for go to dashboard)
      if (sequenceRef.current && !hasCtrl && !hasAlt && !hasShift) {
        const sequence = `${sequenceRef.current} ${e.key.toLowerCase()}`;
        sequenceRef.current = '';
        if (sequenceTimeoutRef.current) {
          clearTimeout(sequenceTimeoutRef.current);
        }

        // Find matching sequence shortcut
        const shortcut = shortcuts.find(
          s => s.sequence === sequence && (s.enabled ?? true)
        );

        if (shortcut) {
          e.preventDefault();
          shortcut.action();
          return;
        }
      }

      // Start new sequence if 'g' is pressed
      if (e.key.toLowerCase() === 'g' && !hasCtrl && !hasAlt && !hasShift) {
        sequenceRef.current = 'g';
        // Reset sequence after 1 second
        if (sequenceTimeoutRef.current) {
          clearTimeout(sequenceTimeoutRef.current);
        }
        sequenceTimeoutRef.current = setTimeout(() => {
          sequenceRef.current = '';
        }, 1000);
        return;
      }

      // Find matching shortcut
      const shortcut = shortcuts.find(s => {
        if (!(s.enabled ?? true)) return false;
        if (s.sequence) return false; // Sequence shortcuts handled above

        const keyMatch = s.key.toLowerCase() === e.key.toLowerCase();
        if (!keyMatch) return false;

        // Check modifiers
        const requiredModifiers = s.modifiers || [];
        const hasRequiredCtrl = requiredModifiers.includes('ctrl') || requiredModifiers.includes('cmd');
        const hasRequiredAlt = requiredModifiers.includes('alt');
        const hasRequiredShift = requiredModifiers.includes('shift');

        return (
          (!hasRequiredCtrl || hasCtrl) &&
          (!hasRequiredAlt || hasAlt) &&
          (!hasRequiredShift || hasShift) &&
          (hasRequiredCtrl || !hasCtrl) &&
          (hasRequiredAlt || !hasAlt) &&
          (hasRequiredShift || !hasShift)
        );
      });

      if (shortcut) {
        e.preventDefault();
        shortcut.action();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (sequenceTimeoutRef.current) {
        clearTimeout(sequenceTimeoutRef.current);
      }
    };
  }, [shortcuts, enabled]);
};

/**
 * Global keyboard shortcuts available everywhere
 */
export const useGlobalShortcuts = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const shortcuts: KeyboardShortcut[] = [
    // Navigation - Go to pages (g + letter)
    {
      key: 'd',
      sequence: 'g d',
      description: 'Go to Dashboard',
      action: () => navigate('/'),
      category: 'navigation',
    },
    {
      key: 'p',
      sequence: 'g p',
      description: 'Go to Projects',
      action: () => navigate('/projects'),
      category: 'navigation',
    },
    {
      key: 's',
      sequence: 'g s',
      description: 'Go to Settings',
      action: () => navigate('/settings'),
      category: 'navigation',
    },

    // Navigation - History
    {
      key: '[',
      modifiers: ['cmd'],
      description: 'Go Back',
      action: () => window.history.back(),
      category: 'navigation',
    },
    {
      key: ']',
      modifiers: ['cmd'],
      description: 'Go Forward',
      action: () => window.history.forward(),
      category: 'navigation',
    },

    // UI shortcuts
    {
      key: 'Escape',
      description: 'Close modal or cancel',
      action: () => {
        // Trigger escape event for modals to handle
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      },
      category: 'ui',
    },
  ];

  useKeyboardShortcuts({ shortcuts });
};

/**
 * Format shortcut for display
 */
export const formatShortcut = (shortcut: KeyboardShortcut): string => {
  if (shortcut.sequence) {
    return shortcut.sequence.toUpperCase().split(' ').join(' then ');
  }

  const parts: string[] = [];
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  if (shortcut.modifiers) {
    if (shortcut.modifiers.includes('ctrl') || shortcut.modifiers.includes('cmd')) {
      parts.push(isMac ? '⌘' : 'Ctrl');
    }
    if (shortcut.modifiers.includes('shift')) {
      parts.push(isMac ? '⇧' : 'Shift');
    }
    if (shortcut.modifiers.includes('alt')) {
      parts.push(isMac ? '⌥' : 'Alt');
    }
  }

  parts.push(shortcut.key.toUpperCase());

  return parts.join(isMac ? '' : '+');
};

/**
 * Keyboard shortcut categories for help modal
 */
export const SHORTCUT_CATEGORIES = {
  navigation: 'Navigation',
  actions: 'Actions',
  selection: 'Selection',
  ui: 'Interface',
} as const;
