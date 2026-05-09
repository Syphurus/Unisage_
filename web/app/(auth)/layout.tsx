import { RouteTransition } from "@/components/shared/RouteTransition";
import { PhoneFrame } from "@/components/unisage/AppShell";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PhoneFrame className="md:!max-w-[520px] lg:!max-w-[560px]">
      <RouteTransition>{children}</RouteTransition>
    </PhoneFrame>
  );
}
