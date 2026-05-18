"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { authAPI } from "@/lib/api";
import {
  resetPasswordSchema,
  type ResetPasswordFormData,
} from "@/lib/validations";
import { TopHeader } from "@/components/unisage/AppShell";
import { Pill, PrimaryButton } from "@/components/unisage/primitives";

export default function ResetPasswordClient({
  initialToken,
}: {
  initialToken: string;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: initialToken,
    },
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsSubmitting(true);
    try {
      await authAPI.resetPassword({
        token: data.token,
        newPassword: data.newPassword,
      });
      toast.success("Password updated successfully");
      router.push("/login");
    } catch (error) {
      const e = error as { message?: string };
      toast.error(e.message || "Failed to update password");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pb-32">
      <TopHeader back="/forgot-password" />
      <div className="px-5 pt-2 md:px-8 md:pt-4">
        <Pill variant="mint" className="mb-4">
          Set new password
        </Pill>
        <h1 className="text-[34px] font-bold leading-[1.05] tracking-[-0.01em] text-[rgb(var(--fg))]">
          Enter the code
          <br />
          and continue.
        </h1>
        <p className="mt-3 text-[14px] text-chalk-400">
          Use the reset code from the recovery step to set a new password.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-4">
          <div>
            <label className="mb-2 block text-[10px] font-semibold uppercase tracking-cap text-chalk-500">
              Reset code
            </label>
            <input
              type="text"
              autoComplete="one-time-code"
              {...register("token")}
              placeholder="Paste reset code"
              className="w-full rounded-[12px] border border-white/[0.08] bg-[rgb(var(--bg-elev))] px-4 py-3.5 text-[15px] text-[rgb(var(--fg))] placeholder:text-chalk-500 focus:border-mint-500 focus:outline-none"
            />
            {errors.token && (
              <p className="mt-1 text-[12px] text-flame-500">
                {errors.token.message}
              </p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-[10px] font-semibold uppercase tracking-cap text-chalk-500">
              New password
            </label>
            <input
              type="password"
              autoComplete="new-password"
              {...register("newPassword")}
              placeholder="At least 8 characters"
              className="w-full rounded-[12px] border border-white/[0.08] bg-[rgb(var(--bg-elev))] px-4 py-3.5 text-[15px] text-[rgb(var(--fg))] placeholder:text-chalk-500 focus:border-mint-500 focus:outline-none"
            />
            {errors.newPassword && (
              <p className="mt-1 text-[12px] text-flame-500">
                {errors.newPassword.message}
              </p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-[10px] font-semibold uppercase tracking-cap text-chalk-500">
              Confirm password
            </label>
            <input
              type="password"
              autoComplete="new-password"
              {...register("confirmPassword")}
              placeholder="Re-enter password"
              className="w-full rounded-[12px] border border-white/[0.08] bg-[rgb(var(--bg-elev))] px-4 py-3.5 text-[15px] text-[rgb(var(--fg))] placeholder:text-chalk-500 focus:border-mint-500 focus:outline-none"
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-[12px] text-flame-500">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <p className="pt-1 text-center text-[13px] text-chalk-400">
            Back to sign in?{" "}
            <Link
              href="/login"
              className="font-medium text-mint-400 hover:text-mint-300"
            >
              Log in
            </Link>
          </p>

          <div className="sticky-cta">
            <PrimaryButton type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Updating..." : "Update password"}{" "}
              <ArrowRight className="h-4 w-4" />
            </PrimaryButton>
          </div>
        </form>

        <p className="mt-4 flex items-center gap-2 text-[12px] text-chalk-500">
          <LockKeyhole className="h-3.5 w-3.5" />
          The code expires after 30 minutes.
        </p>
      </div>
    </div>
  );
}