import { cn } from "@/lib/utils";

interface LoadingSkeletonProps {
  className?: string;
  variant?: "dashboard" | "card" | "list" | "content";
}

export function LoadingSkeleton({
  className,
  variant = "dashboard",
}: LoadingSkeletonProps) {
  if (variant === "card") {
    return (
      <div
        className={cn(
          "rounded-2xl border border-white/70 bg-white/90 p-6 shadow-soft animate-pulse",
          className
        )}
      >
        <div className="h-4 bg-gray-200 rounded-full w-3/4 mb-4" />
        <div className="h-3 bg-gray-100 rounded-full w-1/2 mb-6" />
        <div className="h-2.5 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full w-full mb-3" />
        <div className="h-3 bg-gray-100 rounded-full w-1/3" />
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div className={cn("space-y-4", className)}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-white/70 bg-white/90 p-4 shadow-soft animate-pulse"
          >
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 bg-gray-200 rounded-2xl" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded-full w-2/3 mb-2" />
                <div className="h-3 bg-gray-100 rounded-full w-1/3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === "content") {
    return (
      <div
        className={cn(
          "max-w-4xl mx-auto p-6 space-y-6 animate-pulse",
          className
        )}
      >
        <div className="h-8 bg-gray-200 rounded-full w-2/3 mb-2" />
        <div className="h-4 bg-gray-100 rounded-full w-1/3 mb-8" />
        <div className="space-y-3">
          <div className="h-3 bg-gray-100 rounded-full w-full" />
          <div className="h-3 bg-gray-100 rounded-full w-5/6" />
          <div className="h-3 bg-gray-100 rounded-full w-4/5" />
          <div className="h-3 bg-gray-100 rounded-full w-full" />
          <div className="h-3 bg-gray-100 rounded-full w-3/4" />
        </div>
      </div>
    );
  }

  // Dashboard variant
  return (
    <div
      className={cn(
        "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8",
        className
      )}
    >
      {/* Welcome header skeleton */}
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded-full w-1/3 mb-2" />
        <div className="h-4 bg-gray-100 rounded-full w-1/4" />
      </div>

      {/* Cards row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
        <div className="rounded-2xl border border-white/70 bg-white/90 p-6 shadow-soft">
          <div className="h-6 bg-gray-200 rounded-full w-1/2 mb-4" />
          <div className="h-10 bg-gray-100 rounded-full w-2/3 mb-3" />
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="h-6 w-6 bg-gray-200 rounded-full" />
            ))}
          </div>
        </div>
        <div className="lg:col-span-2 rounded-2xl border border-white/70 bg-white/90 p-6 shadow-soft">
          <div className="h-4 bg-gray-200 rounded-full w-1/3 mb-3" />
          <div className="h-6 bg-gray-200 rounded-full w-2/3 mb-2" />
          <div className="h-4 bg-gray-100 rounded-full w-1/2 mb-4" />
          <div className="h-2.5 bg-gray-100 rounded-full w-full mb-4" />
          <div className="h-10 bg-brand-100 rounded-2xl w-1/3" />
        </div>
      </div>

      {/* Subject grid skeleton */}
      <div>
        <div className="h-6 bg-gray-200 rounded w-1/4 mb-6 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-white/70 bg-white/90 p-5 shadow-soft animate-pulse"
            >
              <div className="h-5 bg-gray-200 rounded-full w-3/4 mb-2" />
              <div className="h-3 bg-gray-100 rounded-full w-1/2 mb-4" />
              <div className="h-16 w-16 bg-gray-100 rounded-full mx-auto mb-4" />
              <div className="h-3 bg-gray-100 rounded-full w-2/3 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
