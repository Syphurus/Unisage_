import * as React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em]",
  {
    variants: {
      variant: {
        default: "bg-[#E2EAF8] text-[#0D1B2A]",
        secondary: "bg-[#F4F4FC] text-[#707891] border border-[#EBEBF5]",
        success: "bg-[#EAFBEF] text-[#22C55E]",
        warning: "bg-[#FFF3E2] text-[#D97706]",
        error: "bg-[#FFE9E9] text-[#EF4444]",
        outline: "border border-[#22C55E] bg-white text-[#22C55E]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
