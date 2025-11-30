import React, { useState, useRef, useEffect, createContext, useContext } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ChevronDown, Check, Loader2, X, Search, Command, AlertTriangle, FileQuestion } from 'lucide-react';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- SPINNER ---
export const Spinner: React.FC<{ className?: string }> = ({ className }) => (
  <Loader2 className={cn("animate-spin h-4 w-4", className)} />
);

// --- EMPTY STATE ---
export interface EmptyStateProps {
    title: string;
    description: string;
    icon?: React.ElementType;
    action?: React.ReactNode;
    className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, description, icon: Icon = FileQuestion, action, className }) => (
    <div className={cn("flex flex-col items-center justify-center py-16 text-center animate-in fade-in zoom-in-95 duration-500", className)}>
        <div className="bg-gradient-to-br from-zinc-50 to-zinc-100 p-5 rounded-2xl mb-5 ring-1 ring-black/5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)]">
            <Icon className="h-8 w-8 text-zinc-400" />
        </div>
        <h3 className="text-lg font-semibold text-zinc-900 mb-2">{title}</h3>
        <p className="text-sm text-zinc-500 max-w-sm mb-6 leading-relaxed">{description}</p>
        {action}
    </div>
);

// --- ERROR STATE ---
export interface ErrorStateProps {
    title?: string;
    description?: string;
    onRetry?: () => void;
    retryLabel?: string;
    fullPage?: boolean;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ 
    title = "Something went wrong", 
    description = "We couldn't load the requested data. Please try again.", 
    onRetry, 
    retryLabel = "Try Again",
    fullPage = false
}) => (
    <div className={cn("flex flex-col items-center justify-center text-center p-8", fullPage ? "min-h-[60vh]" : "py-12")}>
        <div className="bg-red-50 p-4 rounded-full mb-4 ring-1 ring-red-100 shadow-sm">
            <AlertTriangle className="h-10 w-10 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-zinc-900 mb-2">{title}</h2>
        <p className="text-zinc-500 max-w-md mb-6">{description}</p>
        {onRetry && (
            <Button onClick={onRetry} variant="outline" className="min-w-[120px]">
                {retryLabel}
            </Button>
        )}
    </div>
);

// --- CLIENT LOGO ---
export const ClientLogo: React.FC<{ clientName: string; website?: string; className?: string }> = ({ clientName, website, className }) => {
  const [error, setError] = useState(false);
  
  const logoUrl = website ? `https://logo.clearbit.com/${website}` : null;

  const initials = clientName
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const colors = [
    'from-blue-100 to-indigo-100 text-indigo-700',
    'from-emerald-100 to-teal-100 text-teal-700',
    'from-orange-100 to-amber-100 text-amber-700',
    'from-purple-100 to-pink-100 text-purple-700',
    'from-zinc-100 to-zinc-200 text-zinc-700',
  ];
  const colorClass = colors[clientName.length % colors.length];

  if (logoUrl && !error) {
    return (
      <div className={cn("relative overflow-hidden bg-white flex items-center justify-center transition-transform hover:scale-105 duration-300", className)}>
        <img 
            src={logoUrl} 
            alt={clientName} 
            className="h-full w-full object-contain p-[15%]" 
            onError={() => setError(true)}
        />
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden bg-gradient-to-br flex items-center justify-center font-bold border border-white/50 shadow-inner", colorClass, className)}>
      <span className="text-[40%] tracking-tight">{initials}</span>
    </div>
  );
}

// --- BUTTON ---
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'gradient';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={isLoading || disabled}
        aria-busy={isLoading}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
          {
            'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-primary/20': variant === 'default',
            'bg-gradient-to-br from-zinc-800 to-zinc-950 text-white hover:from-zinc-700 hover:to-zinc-900 shadow-md hover:shadow-lg hover:shadow-zinc-500/20 border border-zinc-700/50': variant === 'gradient',
            'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm': variant === 'destructive',
            'border border-input bg-background hover:bg-zinc-50 hover:text-accent-foreground shadow-sm': variant === 'outline',
            'bg-secondary text-secondary-foreground hover:bg-secondary/80': variant === 'secondary',
            'hover:bg-zinc-100 hover:text-accent-foreground': variant === 'ghost',
            'text-primary underline-offset-4 hover:underline': variant === 'link',
            'h-10 px-4 py-2': size === 'default',
            'h-9 rounded-md px-3': size === 'sm',
            'h-12 rounded-lg px-8 text-base': size === 'lg',
            'h-9 w-9': size === 'icon',
          },
          className
        )}
        {...props}
      >
        {isLoading ? <Spinner className="mr-2" /> : null}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

// --- LABEL ---
export const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-zinc-700", className)}
    {...props}
  />
));
Label.displayName = "Label";

// --- INPUT ---
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-white/50 px-3 py-1 text-sm shadow-sm transition-all file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 hover:border-zinc-300",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

// --- TEXTAREA ---
export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-white/50 px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 hover:border-zinc-300 transition-all",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

// --- CARD ---
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    hoverable?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(({ className, hoverable = false, ...props }, ref) => (
  <div 
    ref={ref} 
    className={cn(
        "rounded-xl border border-zinc-200/60 bg-white text-card-foreground shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] transition-all duration-300", 
        hoverable && "hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1 cursor-default", 
        className
    )} 
    {...props} 
  />
));
Card.displayName = "Card";

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
));
CardHeader.displayName = "CardHeader";

export const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(({ className, ...props }, ref) => (
  <h3 ref={ref} className={cn("text-xl font-semibold leading-none tracking-tight text-zinc-900", className)} {...props} />
));
CardTitle.displayName = "CardTitle";

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-sm text-zinc-500", className)} {...props} />
));
CardDescription.displayName = "CardDescription";

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

// --- BADGE ---
export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info';
  className?: string;
}
export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ring-1 ring-inset",
      {
        'border-transparent bg-primary text-primary-foreground hover:bg-primary/80 ring-transparent shadow-sm': variant === 'default',
        'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 ring-zinc-200': variant === 'secondary',
        'border-transparent bg-red-50 text-red-700 hover:bg-red-100 ring-red-600/10': variant === 'destructive',
        'text-foreground ring-zinc-200': variant === 'outline',
        'border-transparent bg-emerald-50 text-emerald-700 hover:bg-emerald-100 ring-emerald-600/20': variant === 'success',
        'border-transparent bg-amber-50 text-amber-700 hover:bg-amber-100 ring-amber-600/20': variant === 'warning',
        'border-transparent bg-blue-50 text-blue-700 hover:bg-blue-100 ring-blue-700/10': variant === 'info',
      },
      className
    )} {...props} />
  );
}

// --- SEPARATOR ---
export const Separator = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("shrink-0 bg-zinc-200/80 h-[1px] w-full", className)} {...props} />
  )
);
Separator.displayName = "Separator";

// --- SWITCH ---
export const Switch: React.FC<{ checked: boolean; onCheckedChange: (c: boolean) => void; className?: string; 'aria-label'?: string }> = ({ checked, onCheckedChange, className, 'aria-label': ariaLabel }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={ariaLabel}
    onClick={() => onCheckedChange(!checked)}
    className={cn(
      "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
      checked ? "bg-primary" : "bg-zinc-200",
      className
    )}
  >
    <span
      className={cn(
        "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform",
        checked ? "translate-x-5" : "translate-x-0"
      )}
    />
  </button>
)

// --- SLIDER ---
export const Slider: React.FC<{ value: number[]; onValueChange: (v: number[]) => void; max?: number; step?: number; className?: string }> = ({ value, onValueChange, max=100, step=1, className }) => {
  const percentage = Math.min(100, Math.max(0, ((value[0] || 0) / max) * 100));
  
  const handleMouseDown = (e: React.MouseEvent) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const p = Math.max(0, Math.min(1, x / rect.width));
      onValueChange([Math.round(p * max)]);
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
      const current = value[0] || 0;
      if (e.key === 'ArrowRight') onValueChange([Math.min(max, current + (step || 1))]);
      if (e.key === 'ArrowLeft') onValueChange([Math.max(0, current - (step || 1))]);
  }

  return (
    <div 
        className={cn("relative flex w-full touch-none select-none items-center cursor-pointer h-5 group", className)}
        onMouseDown={handleMouseDown}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="slider"
        aria-valuenow={value[0]}
        aria-valuemin={0}
        aria-valuemax={max}
    >
      <div className="relative h-2 w-full grow overflow-hidden rounded-full bg-zinc-100">
        <div className="absolute h-full bg-primary transition-all duration-100 ease-out" style={{ width: `${percentage}%` }} />
      </div>
      <div 
        className="absolute h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 shadow-md group-hover:scale-110 duration-200"
        style={{ left: `calc(${percentage}% - 10px)` }}
      />
    </div>
  )
}

// --- AVATAR ---
export const Avatar: React.FC<{ src?: string; fallback: string; className?: string } & React.HTMLAttributes<HTMLDivElement>> = ({ src, fallback, className, ...props }) => {
  return (
    <div className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full border border-border bg-muted shadow-sm", className)} {...props}>
      {src ? (
        <img src={src} alt="Avatar" className="aspect-square h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-full bg-zinc-100 text-zinc-500 text-xs font-semibold">
          {fallback}
        </div>
      )}
    </div>
  );
};

// --- PROGRESS ---
export const Progress = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { value: number, indicatorClassName?: string }>(
  ({ className, value, indicatorClassName, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-zinc-100", className)}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      {...props}
    >
      <div
        className={cn("h-full w-full flex-1 bg-primary transition-all duration-500 ease-out", indicatorClassName)}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </div>
  )
);
Progress.displayName = "Progress";

// --- CIRCULAR PROGRESS ---
export const CircularProgress: React.FC<{ value: number; size?: number; strokeWidth?: number; className?: string; color?: string; showText?: boolean }> = ({ 
    value, 
    size = 40, 
    strokeWidth = 4, 
    className,
    color = "text-primary",
    showText = true
}) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (value / 100) * circumference;

    return (
        <div 
            className={cn("relative flex items-center justify-center", className)} 
            style={{ width: size, height: size }}
            role="progressbar"
            aria-valuenow={value}
            aria-valuemin={0}
            aria-valuemax={100}
        >
            <svg className="transform -rotate-90 w-full h-full drop-shadow-sm">
                <circle
                    className="text-zinc-100"
                    strokeWidth={strokeWidth}
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
                <circle
                    className={cn("transition-all duration-1000 ease-out", color)}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
            </svg>
            {showText && <span className="absolute text-xs font-bold text-foreground">{Math.round(value)}%</span>}
        </div>
    );
};

// --- SKELETON ---
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("animate-pulse rounded-md bg-zinc-200/70", className)} {...props} />
  )
}

// --- TABS (Radix UI Style) ---
interface TabsContextType {
    activeTab: string;
    setActiveTab: (value: string) => void;
}
const TabsContext = React.createContext<TabsContextType | undefined>(undefined);

export const Tabs: React.FC<{ defaultValue: string; className?: string; children: React.ReactNode }> = ({ defaultValue, className, children }) => {
    const [activeTab, setActiveTab] = useState(defaultValue);
    return (
        <TabsContext.Provider value={{ activeTab, setActiveTab }}>
            <div className={cn("w-full", className)}>{children}</div>
        </TabsContext.Provider>
    );
};

export const TabsList: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
    <div role="tablist" className={cn("inline-flex h-10 items-center justify-center rounded-lg bg-zinc-100 p-1 text-muted-foreground overflow-x-auto no-scrollbar max-w-full shadow-inner", className)}>
        {children}
    </div>
);

export const TabsTrigger: React.FC<{ value: string; className?: string; children: React.ReactNode }> = ({ value, className, children }) => {
    const context = React.useContext(TabsContext);
    if (!context) throw new Error("TabsTrigger must be used within Tabs");
    
    const isActive = context.activeTab === value;
    return (
        <button
            role="tab"
            aria-selected={isActive}
            onClick={() => context.setActiveTab(value)}
            data-state={isActive ? "active" : "inactive"}
            className={cn(
                "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                isActive ? "bg-white text-foreground shadow-sm" : "hover:bg-white/50 hover:text-foreground text-zinc-500",
                className
            )}
        >
            {children}
        </button>
    );
};

export const TabsContent: React.FC<{ value: string; className?: string; children: React.ReactNode }> = ({ value, className, children }) => {
    const context = React.useContext(TabsContext);
    if (!context) throw new Error("TabsContent must be used within Tabs");
    
    if (context.activeTab !== value) return null;

    return (
        <div role="tabpanel" className={cn("mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 animate-in fade-in slide-in-from-bottom-2 duration-300", className)}>
            {children}
        </div>
    );
};

// --- CUSTOM SELECT (Visual Replacement) ---
interface SelectProps {
    value?: string;
    onValueChange?: (value: string) => void;
    placeholder?: string;
    options: { label: string; value: string }[];
    className?: string;
    triggerClassName?: string;
}

export const Select: React.FC<SelectProps> = ({ value, onValueChange, placeholder, options, className, triggerClassName }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedLabel = options.find(o => o.value === value)?.label || placeholder || "Select...";

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen(!open);
        }
    }

    return (
        <div className={cn("relative inline-block text-left w-full", className)} ref={ref}>
            <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={open}
                className={cn(
                    "inline-flex w-full justify-between items-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-zinc-900 shadow-sm ring-1 ring-inset ring-zinc-300 hover:bg-zinc-50 transition-colors focus:ring-2 focus:ring-primary z-50",
                    triggerClassName
                )}
                onClick={(e) => {
                    e.stopPropagation();
                    setOpen(!open);
                }}
                onKeyDown={handleKeyDown}
            >
                {selectedLabel}
                <ChevronDown className="h-4 w-4 text-zinc-400" aria-hidden="true" />
            </button>

            {open && (
                <div role="listbox" className="absolute right-0 z-[60] mt-2 w-full origin-top-right rounded-xl bg-white shadow-xl ring-1 ring-black/5 focus:outline-none max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                    <div className="py-1">
                        {options.map((opt) => (
                            <button
                                type="button"
                                role="option"
                                aria-selected={value === opt.value}
                                key={opt.value}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onValueChange?.(opt.value);
                                    setOpen(false);
                                }}
                                className={cn(
                                    "flex items-center justify-between w-full px-4 py-2.5 text-sm text-left hover:bg-zinc-50 transition-colors",
                                    value === opt.value ? "bg-primary/5 text-primary font-medium" : "text-zinc-700"
                                )}
                            >
                                {opt.label}
                                {value === opt.value && <Check className="h-4 w-4 text-primary" />}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- DROPDOWN MENU (Simplified) ---
interface DropdownMenuProps {
    trigger: React.ReactNode;
    children: React.ReactNode;
    align?: 'left' | 'right';
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({ trigger, children, align = 'right' }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative inline-block text-left" ref={ref}>
            <div onClick={() => setOpen(!open)} className="cursor-pointer active:scale-95 transition-transform">
                {trigger}
            </div>
            {open && (
                <div className={cn(
                    "absolute z-50 mt-2 w-56 origin-top-right rounded-xl bg-white shadow-xl ring-1 ring-black/5 focus:outline-none py-1 border border-zinc-100 animate-in fade-in zoom-in-95 duration-100",
                    align === 'right' ? 'right-0' : 'left-0'
                )}>
                    {children}
                </div>
            )}
        </div>
    );
};

export const DropdownMenuItem: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => {
    return (
        <div 
            className={cn("block px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 cursor-pointer transition-colors first:rounded-t-lg last:rounded-b-lg", className)} 
            {...props} 
        />
    )
}

// --- DIALOG / MODAL ---
interface DialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children }) => {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
             {/* Backdrop */}
             <div 
                className="fixed inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300" 
                onClick={() => onOpenChange(false)}
             />
             {/* Content */}
             <div className="relative bg-white rounded-2xl border border-white/20 shadow-2xl w-[95vw] md:w-full md:max-w-lg p-8 animate-in scale-in-95 fade-in duration-300 z-50">
                 {children}
                 <button 
                    onClick={() => onOpenChange(false)}
                    className="absolute top-4 right-4 p-2 rounded-full opacity-70 transition-all hover:opacity-100 hover:bg-zinc-100"
                 >
                     <X className="h-4 w-4" />
                     <span className="sr-only">Close</span>
                 </button>
             </div>
        </div>
    );
};

export const DialogHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
    <div className={cn("flex flex-col space-y-2 text-center sm:text-left mb-6", className)} {...props} />
);
export const DialogFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
    <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3 mt-8", className)} {...props} />
);

// --- COMMAND PALETTE ---
interface CommandPaletteProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    items: { label: string; icon?: any; action: () => void; group?: string }[];
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onOpenChange, items }) => {
    const [search, setSearch] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 100);
            setSearch('');
        }
    }, [open]);

    if (!open) return null;

    const filteredItems = items.filter(item => item.label.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] p-4">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => onOpenChange(false)} />
            <div className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl border border-zinc-200 overflow-hidden animate-in scale-in fade-in duration-200 z-50 flex flex-col">
                <div className="flex items-center border-b border-zinc-200 px-3">
                    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                    <input 
                        ref={inputRef}
                        className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-zinc-400 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Type a command or search..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-zinc-100 px-1.5 font-mono text-[10px] font-medium text-zinc-500 opacity-100">
                        <span className="text-xs">ESC</span>
                    </kbd>
                </div>
                <div className="max-h-[300px] overflow-y-auto p-2">
                    {filteredItems.length === 0 && <p className="p-4 text-center text-sm text-zinc-500">No results found.</p>}
                    {filteredItems.map((item, i) => (
                        <div 
                            key={i}
                            onClick={() => {
                                item.action();
                                onOpenChange(false);
                            }}
                            className="relative flex cursor-default select-none items-center rounded-lg px-2 py-2 text-sm outline-none hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer transition-colors"
                        >
                            {item.icon && <item.icon className="mr-3 h-4 w-4 text-zinc-500" />}
                            <span>{item.label}</span>
                            {item.group && <span className="ml-auto text-xs text-zinc-400">{item.group}</span>}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// --- TOAST SYSTEM ---
type ToastType = {
    id: string;
    title: string;
    description?: string;
    variant?: 'default' | 'success' | 'destructive';
};

interface ToastContextType {
    toasts: ToastType[];
    addToast: (toast: Omit<ToastType, 'id'>) => void;
    removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<ToastType[]>([]);

    const addToast = (toast: Omit<ToastType, 'id'>) => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts(prev => [...prev, { ...toast, id }]);
        setTimeout(() => removeToast(id), 5000); // Auto dismiss
    };

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    return (
        <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
            {children}
            {/* Toast Container */}
            <div className="fixed bottom-0 right-0 z-[100] flex flex-col gap-2 p-6 max-w-[420px] w-full pointer-events-none">
                {toasts.map(toast => (
                    <div 
                        key={toast.id}
                        className={cn(
                            "pointer-events-auto relative w-full rounded-xl border p-4 shadow-xl transition-all animate-in slide-in-right fade-in duration-300 ring-1 ring-black/5",
                            toast.variant === 'destructive' ? "bg-white text-red-600 border-red-100" :
                            toast.variant === 'success' ? "bg-white text-emerald-700 border-emerald-100" :
                            "bg-white text-zinc-900 border-zinc-200"
                        )}
                    >
                        <div className="flex justify-between items-start gap-2">
                             <div className="grid gap-1">
                                 <h5 className="text-sm font-bold">{toast.title}</h5>
                                 {toast.description && <p className="text-xs text-muted-foreground opacity-90">{toast.description}</p>}
                             </div>
                             <button onClick={() => removeToast(toast.id)} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-zinc-100">
                                 <X className="h-4 w-4" />
                             </button>
                        </div>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error("useToast must be used within ToastProvider");
    return context;
};