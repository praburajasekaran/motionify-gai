/**
 * Keyboard Shortcuts Help Modal
 *
 * Displays all available keyboard shortcuts organized by category.
 * Triggered by pressing '?' key anywhere in the app.
 */

import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { KeyboardShortcut, formatShortcut, SHORTCUT_CATEGORIES } from '../hooks/useKeyboardShortcuts';
import { Command, Navigation, Zap, Layout } from 'lucide-react';
import { cn } from './ui/design-system';

interface KeyboardShortcutsHelpProps {
  shortcuts: KeyboardShortcut[];
}

const categoryIcons = {
  navigation: Navigation,
  actions: Zap,
  selection: Command,
  ui: Layout,
};

export const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({ shortcuts }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Listen for '?' key to open help
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only open if not in input/textarea
      const target = e.target as HTMLElement;
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
      const isContentEditable = target.contentEditable === 'true';

      if (
        e.key === '?' &&
        !isInput &&
        !isContentEditable &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Group shortcuts by category
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    const category = shortcut.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(shortcut);
    return acc;
  }, {} as Record<string, KeyboardShortcut[]>);

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      title="Keyboard Shortcuts"
      size="lg"
    >
      <div className="px-6 pb-6">
        {/* Header */}
        <p className="text-sm text-muted-foreground mb-6">
          Master these shortcuts to navigate and work faster. Press <kbd className="px-2 py-1 text-xs font-semibold bg-zinc-100 border border-zinc-200 rounded">?</kbd> anytime to see this help.
        </p>

        {/* Shortcuts by Category */}
        <div className="space-y-8">
          {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => {
            const Icon = categoryIcons[category as keyof typeof categoryIcons];
            const categoryName = SHORTCUT_CATEGORIES[category as keyof typeof SHORTCUT_CATEGORIES];

            return (
              <div key={category}>
                {/* Category Header */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground">{categoryName}</h3>
                </div>

                {/* Shortcuts List */}
                <div className="space-y-2 ml-10">
                  {categoryShortcuts.map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-zinc-50 transition-colors group"
                    >
                      <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                        {shortcut.description}
                      </span>
                      <kbd
                        className={cn(
                          "px-3 py-1.5 text-xs font-semibold rounded-md border shadow-sm transition-all",
                          "bg-white border-zinc-200 text-zinc-700",
                          "group-hover:border-primary/30 group-hover:bg-primary/5 group-hover:text-primary"
                        )}
                      >
                        {formatShortcut(shortcut)}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Pro Tip */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Zap className="h-3 w-3 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-blue-900 mb-1">Pro Tip</p>
              <p className="text-sm text-blue-700">
                Use <kbd className="px-2 py-1 text-xs font-semibold bg-white border border-blue-200 rounded mx-1">Cmd+K</kbd> to open the command palette for quick access to any action.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-xs text-muted-foreground mt-6 text-center">
          More shortcuts are available on specific pages like Projects and Project Detail.
        </p>
      </div>
    </Modal>
  );
};

/**
 * Keyboard shortcut hint component
 * Shows shortcut hint on hover for buttons/actions
 */
interface ShortcutHintProps {
  shortcut: string;
  children: React.ReactNode;
  className?: string;
}

export const ShortcutHint: React.FC<ShortcutHintProps> = ({
  shortcut,
  children,
  className,
}) => {
  return (
    <div className={cn("relative group", className)}>
      {children}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <kbd className="px-2 py-1 text-xs font-semibold bg-zinc-800 text-white rounded shadow-lg border border-zinc-700">
          {shortcut}
        </kbd>
      </div>
    </div>
  );
};
