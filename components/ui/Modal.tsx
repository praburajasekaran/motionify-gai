import React, { useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from './design-system';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  ariaLabel?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  ariaLabel,
  children,
  size = 'lg',
  showCloseButton = true,
  className,
}) => {
  const returnFocus = useRef<HTMLElement | null>(null);
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    full: 'max-w-[95vw] h-[95vh]',
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in data-[state=closed]:animate-out data-[state=closed]:fade-out duration-200">
          <Dialog.Content
            aria-describedby={undefined}
            onOpenAutoFocus={() => {
              returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
            }}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              returnFocus.current?.focus();
            }}
            className={cn(
              'relative w-full rounded-2xl bg-card shadow-2xl outline-none',
              'data-[state=open]:animate-in data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 duration-200',
              sizeClasses[size],
              className
            )}
          >
            {(title || showCloseButton) && (
              <div className="flex items-center justify-between border-b border-border px-6 py-4">
                {title && <Dialog.Title className="text-xl font-bold text-foreground">{title}</Dialog.Title>}
                {showCloseButton && (
                  <Dialog.Close className="ml-auto rounded-full p-2 text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Close modal">
                    <X className="h-5 w-5" />
                  </Dialog.Close>
                )}
              </div>
            )}
            {!title && <Dialog.Title className="sr-only">{ariaLabel || 'Dialog'}</Dialog.Title>}
            <div className="max-h-[85vh] overflow-y-auto">{children}</div>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
