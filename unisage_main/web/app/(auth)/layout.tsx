import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { RouteTransition } from "@/components/shared/RouteTransition";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[#f5f7ff]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 right-[-6rem] h-72 w-72 rounded-full bg-brand-200/40 blur-3xl animate-drift" />
        <div className="absolute top-28 left-[-4rem] h-64 w-64 rounded-full bg-cyan-200/30 blur-3xl animate-float" />
      </div>
      {/* Header */}
      <header className="relative z-10 py-6 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 w-fit mx-auto rounded-full border border-white/70 bg-white/75 px-4 py-2 shadow-soft backdrop-blur-sm"
        >
          <div className="h-8 w-8 rounded-2xl bg-gradient-to-br from-brand-600 to-violet-600 flex items-center justify-center shadow-glow">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-xl text-gray-900">UniSage</span>
        </Link>
      </header>

      {/* Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 pb-16">
        <RouteTransition>{children}</RouteTransition>
      </main>
    </div>
  );
}
