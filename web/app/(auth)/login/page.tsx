"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/lib/hooks/useAuth";
import { loginSchema, type LoginFormData } from "@/lib/validations";
import { toast } from "sonner";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { TopHeader } from "@/components/unisage/AppShell";
import { Pill, PrimaryButton } from "@/components/unisage/primitives";

export default function LoginPage() {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    try {
      await login(data.email, data.password);
      toast.success("Signed in.");
    } catch (error) {
      const e = error as { message?: string };
      toast.error(e.message || "Failed to sign in");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pb-32">
      <TopHeader back="/" />
      <div className="px-5 pt-2 md:px-8 md:pt-4">
        <Pill variant="mint" className="mb-4">
          Welcome back
        </Pill>
        <h1 className="text-[34px] font-bold leading-[1.05] tracking-[-0.01em] text-[rgb(var(--fg))]">
          Pick up where
          <br />
          you left.
        </h1>
        <p className="mt-3 text-[14px] text-chalk-400">
          Sign in to resume your revision plan.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-4">
          <div>
            <label className="mb-2 block text-[10px] font-semibold uppercase tracking-cap text-chalk-500">
              Email
            </label>
            <input
              type="email"
              autoComplete="email"
              {...register("email")}
              placeholder="you@college.edu"
              className="w-full rounded-[12px] border border-white/[0.08] bg-[rgb(var(--bg-elev))] px-4 py-3.5 text-[15px] text-[rgb(var(--fg))] placeholder:text-chalk-500 focus:border-mint-500 focus:outline-none"
            />
            {errors.email && (
              <p className="mt-1 text-[12px] text-flame-500">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-[10px] font-semibold uppercase tracking-cap text-chalk-500">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                {...register("password")}
                placeholder="••••••••"
                className="w-full rounded-[12px] border border-white/[0.08] bg-[rgb(var(--bg-elev))] px-4 py-3.5 pr-11 text-[15px] text-[rgb(var(--fg))] placeholder:text-chalk-500 focus:border-mint-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 grid h-9 w-9 place-items-center text-chalk-400 hover:text-[rgb(var(--fg))]"
                aria-label="Toggle password"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-[12px] text-flame-500">
                {errors.password.message}
              </p>
            )}
          </div>

          <p className="pt-1 text-center text-[13px] text-chalk-400">
            New here?{" "}
            <Link
              href="/signup"
              className="font-medium text-mint-400 hover:text-mint-300"
            >
              Create an account
            </Link>
          </p>

          <div className="sticky-cta">
            <PrimaryButton type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Signing in..." : "Continue"}{" "}
              <ArrowRight className="h-4 w-4" />
            </PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  );
}
