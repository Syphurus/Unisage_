import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          type={type}
          className={cn(
            "flex h-10 w-full rounded-lg border border-[#EBEBF5] bg-white px-3 py-2 text-[13px] text-[#0D1B2A] ring-offset-[rgb(var(--bg))] file:border-0 file:bg-transparent file:text-[13px] file:font-medium placeholder:text-[#707891] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D1B2A]/15 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            error
              ? "border-red-300 focus-visible:ring-red-500"
              : "hover:border-[#D7DBEA]",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-xs text-red-500 animate-fade-in">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
