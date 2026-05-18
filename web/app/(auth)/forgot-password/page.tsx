"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ArrowRight, KeyRound } from "lucide-react";
import { authAPI } from "@/lib/api";
import {
  forgotPasswordSchema,
  type ForgotPasswordFormData,
} from "@/lib/validations";
import { TopHeader } from "@/components/unisage/AppShell";
import { Pill, PrimaryButton } from "@/components/unisage/primitives";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsSubmitting(true);
    try {
      const response = await authAPI.requestPasswordReset({
        email: data.email,
      });
      const token = response.data?.resetToken;

      if (!token) {
        toast.error("Could not create a reset code");
        return;
      }

      toast.success("Reset code created");
      router.push(`/reset-password?token=${encodeURIComponent(token)}`);
    } catch (error) {
      const e = error as { message?: string };
      toast.error(e.message || "Failed to create reset code");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pb-32">
      <TopHeader back="/login" />
      <div className="px-5 pt-2 md:px-8 md:pt-4">
        <Pill variant="mint" className="mb-4">
          Account recovery
        </Pill>
        <h1 className="text-[34px] font-bold leading-[1.05] tracking-[-0.01em] text-[rgb(var(--fg))]">
          Reset your
          <br />
          password.
        </h1>
        <p className="mt-3 text-[14px] text-chalk-400">
          Enter the email on your account to generate a reset code.
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

          <p className="pt-1 text-center text-[13px] text-chalk-400">
            Remembered your password?{" "}
            <Link
              href="/login"
              className="font-medium text-mint-400 hover:text-mint-300"
            >
              Back to sign in
            </Link>
          </p>

          <div className="sticky-cta">
            <PrimaryButton type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating code..." : "Create reset code"}{" "}
              <ArrowRight className="h-4 w-4" />
            </PrimaryButton>
          </div>
        </form>

        <p className="mt-4 flex items-center gap-2 text-[12px] text-chalk-500">
          <KeyRound className="h-3.5 w-3.5" />
          The app will move you to the reset screen after the code is generated.
        </p>
      </div>
    </div>
  );
}