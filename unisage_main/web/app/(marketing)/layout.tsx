import { RouteTransition } from "@/components/shared/RouteTransition";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RouteTransition>{children}</RouteTransition>;
}
