"use client";

import { CheckCircle2, Loader2, Tag, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CouponCardProps {
  code: string;
  onCodeChange: (value: string) => void;
  onApply: () => void;
  onRemove: () => void;
  state: "idle" | "validating" | "applied" | "invalid";
  message: string | null;
  disabled?: boolean;
}

export function CouponCard({
  code,
  onCodeChange,
  onApply,
  onRemove,
  state,
  message,
  disabled,
}: CouponCardProps) {
  const isApplied = state === "applied";
  const isInvalid = state === "invalid";
  const isValidating = state === "validating";

  return (
    <div
      className={cn(
        "rounded-card border bg-white/[0.035] p-4 transition-all duration-300",
        isApplied
          ? "border-emerald-400/35 bg-emerald-400/[0.08]"
          : isInvalid
            ? "border-red-400/30 bg-red-400/[0.07]"
            : "border-white/[0.08]"
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "grid h-8 w-8 place-items-center rounded-full border",
            isApplied
              ? "border-emerald-300/35 bg-emerald-300/10 text-emerald-200"
              : "border-white/[0.1] bg-white/[0.04] text-mint-300"
          )}
        >
          <Tag className="h-4 w-4" />
        </span>
        <div>
          <p className="text-[13px] font-semibold text-[rgb(var(--fg))]">
            Have a coupon code?
          </p>
          <p className="text-[11px] text-chalk-500">
            Apply it before payment to update your final total.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Input
          value={code}
          onChange={(event) => onCodeChange(event.target.value.toUpperCase())}
          onKeyDown={(event) => {
            if (event.key === "Enter") onApply();
          }}
          placeholder="Enter coupon code"
          disabled={disabled || isValidating || isApplied}
          className={cn(
            "h-11 border-white/[0.1] bg-black/20 text-[13px] font-semibold uppercase tracking-[0.12em] text-white placeholder:font-normal placeholder:normal-case placeholder:tracking-normal placeholder:text-chalk-500 focus-visible:ring-mint-400/30",
            isApplied && "border-emerald-300/35",
            isInvalid && "border-red-300/35"
          )}
          aria-label="Coupon code"
        />

        {isApplied ? (
          <Button
            type="button"
            variant="secondary"
            onClick={onRemove}
            disabled={disabled}
            className="h-11 shrink-0 border-emerald-300/25 bg-emerald-300/10 px-4 text-emerald-100 hover:bg-emerald-300/15"
          >
            Remove
          </Button>
        ) : (
          <Button
            type="button"
            onClick={onApply}
            disabled={disabled || isValidating || !code.trim()}
            className="h-11 shrink-0 bg-white text-ink-950 hover:bg-chalk-100"
          >
            {isValidating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Apply
              </>
            ) : (
              "Apply"
            )}
          </Button>
        )}
      </div>

      {message && (
        <div
          className={cn(
            "mt-3 flex items-start gap-2 rounded-lg px-3 py-2 text-[12px] transition-all duration-300",
            isApplied
              ? "bg-emerald-400/10 text-emerald-100"
              : "bg-red-400/10 text-red-100"
          )}
        >
          {isApplied ? (
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-none" />
          ) : (
            <XCircle className="mt-0.5 h-3.5 w-3.5 flex-none" />
          )}
          <span>{message}</span>
        </div>
      )}
    </div>
  );
}
