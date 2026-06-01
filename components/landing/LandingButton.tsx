import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const landingButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        primaryOrange:
          "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-[0_8px_24px_rgba(249,115,22,0.35)] ring-2 ring-orange-400/30 hover:from-orange-600 hover:to-orange-700 focus-visible:ring-orange-300/70",
        primaryViolet:
          "bg-gradient-to-r from-fuchsia-500 via-violet-500 to-blue-500 text-white shadow-[0_10px_30px_rgba(99,102,241,0.35)] hover:from-fuchsia-600 hover:via-violet-600 hover:to-blue-600 focus-visible:ring-violet-300/70",
        secondaryDark:
          "bg-white/5 text-white/90 ring-1 ring-white/10 hover:bg-white/10 hover:ring-white/20 focus-visible:ring-violet-300/70",
        secondaryLight:
          "bg-white/80 text-gray-900 ring-2 ring-gray-300 hover:bg-gray-50 hover:ring-gray-400 focus-visible:ring-orange-300/70",
        iconDark:
          "bg-black/70 text-white ring-1 ring-white/15 hover:bg-black/85 hover:ring-white/25 focus-visible:ring-violet-300/70",
        iconLight:
          "border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-gray-100 focus-visible:ring-gray-300",
      },
      size: {
        xs: "px-3 py-1.5 text-xs",
        sm: "px-4 py-2 text-xs",
        md: "px-5 py-2.5 text-sm",
        lg: "px-6 py-3 text-sm",
        xl: "px-8 py-4 text-base",
        iconSm: "h-9 w-9",
        iconMd: "h-10 w-10",
      },
      width: {
        auto: "",
        full: "w-full",
        flex: "flex-1",
      },
    },
    defaultVariants: {
      variant: "primaryOrange",
      size: "lg",
      width: "auto",
    },
  },
);

interface LandingButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof landingButtonVariants> {
  asChild?: boolean;
}

const LandingButton = React.forwardRef<HTMLButtonElement, LandingButtonProps>(
  ({ className, variant, size, width, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        className={cn(landingButtonVariants({ variant, size, width, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
LandingButton.displayName = "LandingButton";

export { LandingButton, landingButtonVariants };
