import { RouteTransition } from "@/components/shared/RouteTransition";
import { PhoneFrame } from "@/components/unisage/AppShell";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PhoneFrame>
      <RouteTransition>{children}</RouteTransition>
    </PhoneFrame>
  );
}
