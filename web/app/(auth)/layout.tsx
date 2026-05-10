import { RouteTransition } from "@/components/shared/RouteTransition";
import { PhoneFrame } from "@/components/unisage/AppShell";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[rgb(var(--bg))] relative overflow-hidden">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-mint-500/[0.06] blur-3xl" />
      <PhoneFrame>
        <RouteTransition>{children}</RouteTransition>
      </PhoneFrame>
    </div>
  );
}
