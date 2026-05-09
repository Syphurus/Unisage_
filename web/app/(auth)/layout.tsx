import { RouteTransition } from "@/components/shared/RouteTransition";
import { PhoneFrame } from "@/components/unisage/AppShell";

export default function AuthLayout({
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
