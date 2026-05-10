import { RouteTransition } from "@/components/shared/RouteTransition";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[rgb(var(--bg))] relative overflow-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-mint-500/[0.08] blur-3xl" />
      <RouteTransition>{children}</RouteTransition>
    </div>
  );
}
