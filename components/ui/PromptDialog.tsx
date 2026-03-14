import React, { useState, useEffect } from 'react';
import { MessageSquare, X } from 'lucide-react';

interface PromptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (value: string) => void;
  title: string;
  description?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
}

export function PromptDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  placeholder = 'Enter your response...',
  confirmLabel = 'Submit',
  cancelLabel = 'Cancel',
  isLoading = false,
}: PromptDialogProps) {
  const [value, setValue] = useState('');

  useEffect(() => {
    if (!isOpen) setValue('');
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!value.trim() || isLoading) return;
    onConfirm(value.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleConfirm();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="relative transform overflow-hidden rounded-lg bg-card border border-border text-left transition-all sm:my-8 sm:w-full sm:max-w-lg">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-1 rounded-lg text-muted-foreground hover:text-muted-foreground hover:bg-accent transition-colors"
          >
            <X className="w-5 h-5" aria-hidden="true" />
            <span className="sr-only">Close</span>
          </button>

          <div className="bg-card px-6 py-6">
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <MessageSquare className="w-6 h-6" />
              </div>

              {/* Content */}
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground pr-8">
                  {title}
                </h3>
                {description && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {description}
                  </p>
                )}
                <textarea
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={placeholder}
                  rows={3}
                  className="mt-3 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:opacity-50"
                  disabled={isLoading}
                  // eslint-disable-next-line jsx-a11y/no-autofocus
                  autoFocus
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-muted px-6 py-4 flex flex-row-reverse gap-3">
            <button
              onClick={handleConfirm}
              disabled={isLoading || !value.trim()}
              className="inline-flex justify-center rounded-lg px-4 py-2.5 text-sm font-semibold text-white bg-primary hover:bg-[var(--studio-amber-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                confirmLabel
              )}
            </button>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="inline-flex justify-center rounded-lg bg-card px-4 py-2.5 text-sm font-semibold text-foreground ring-1 ring-inset ring-border hover:bg-muted disabled:opacity-50"
            >
              {cancelLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
