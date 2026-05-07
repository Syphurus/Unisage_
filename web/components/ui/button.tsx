import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-[13px] font-medium ring-offset-[rgb(var(--bg))] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-[#0D1B2A] text-white hover:bg-[#091522]",
        destructive:
          "border border-red-500 bg-white text-red-600 hover:bg-red-50",
        outline:
          "border border-[#0D1B2A] bg-white text-[#0D1B2A] hover:bg-[#F4F4FC]",
        secondary:
          "border border-[#EBEBF5] bg-white text-[#0D1B2A] hover:bg-[#F4F4FC]",
        ghost: "text-[#707891] hover:bg-[#F4F4FC] hover:text-[#0D1B2A]",
        link: "text-brand-600 underline-offset-4 hover:underline",
        success: "bg-[#00B4A6] text-white hover:bg-[#00998e]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-[12px]",
        lg: "h-11 px-6 text-[14px]",
        xl: "h-12 px-8 text-[14px]",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      isLoading,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            {children}
          </div>
        ) : (
          children
        )}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
