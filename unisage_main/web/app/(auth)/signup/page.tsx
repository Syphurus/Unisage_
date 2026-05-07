"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/hooks/useAuth";
import { metaAPI } from "@/lib/api";
import { signupSchema, type SignupFormData } from "@/lib/validations";
import { getSemestersForYear } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff, Mail, Lock, User, Hash, Calendar } from "lucide-react";

export default function SignupPage() {
  const { signup } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [colleges, setColleges] = useState<
    Array<{ id: string; name: string; code: string }>
  >([]);
  const [branches, setBranches] = useState<
    Array<{ id: string; name: string; code: string }>
  >([]);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    setValue,
    watch,
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const selectedCollegeCode = watch("collegeCode");
  const selectedYear = useWatch({ control, name: "year" }) || 1;
  const selectedSemester = useWatch({ control, name: "semester" });
  const semesterOptions = getSemestersForYear(selectedYear);

  useEffect(() => {
    if (
      semesterOptions.length > 0 &&
      !semesterOptions.some((semester) => semester.value === selectedSemester)
    ) {
      setValue("semester", semesterOptions[0].value, {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  }, [semesterOptions, selectedSemester, setValue]);

  useEffect(() => {
    async function loadColleges() {
      try {
        const res = await metaAPI.getColleges();
        setColleges(res.data || []);
      } catch (_) {
        setColleges([]);
      }
    }
    loadColleges();
  }, []);

  useEffect(() => {
    async function loadBranches() {
      if (!selectedCollegeCode) {
        setBranches([]);
        return;
      }
      try {
        const res = await metaAPI.getBranches(selectedCollegeCode);
        setBranches(res.data || []);
      } catch (_) {
        setBranches([]);
      }
    }
    loadBranches();
  }, [selectedCollegeCode]);

  const onSubmit = async (data: SignupFormData) => {
    setIsSubmitting(true);
    try {
      await signup({
        email: data.email,
        password: data.password,
        fullName: data.fullName,
        collegeCode: data.collegeCode,
        branchCode: data.branchCode,
        year: data.year,
        semester: data.semester,
        enrollmentNumber: data.enrollmentNumber,
      });
    } catch (error: unknown) {
      const err = error as { error?: { message?: string } };
      toast.error(err?.error?.message || "Failed to create account");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="w-full max-w-md"
    >
      <Card className="shadow-float border border-white/70 bg-white/90">
        <CardHeader className="space-y-1 text-center pb-2">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-violet-600 shadow-glow">
            <User className="h-5 w-5 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">
            Create an account
          </CardTitle>
          <CardDescription>Start your journey to better grades</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="fullName"
                  placeholder="John Doe"
                  className="pl-10"
                  error={errors.fullName?.message}
                  {...register("fullName")}
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@upes.ac.in"
                  className="pl-10"
                  error={errors.email?.message}
                  {...register("email")}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min 8 chars, 1 upper, 1 lower, 1 number"
                  className="pl-10 pr-10"
                  error={errors.password?.message}
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  className="pl-10"
                  error={errors.confirmPassword?.message}
                  {...register("confirmPassword")}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="collegeCode">College</Label>
                <select
                  id="collegeCode"
                  className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                  onChange={(e) => setValue("collegeCode", e.target.value)}
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select college
                  </option>
                  {colleges.map((c) => (
                    <option key={c.id} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {errors.collegeCode && (
                  <p className="mt-1.5 text-xs text-red-500">
                    {errors.collegeCode.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="branchCode">Branch</Label>
                <select
                  id="branchCode"
                  className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                  onChange={(e) => setValue("branchCode", e.target.value)}
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select branch
                  </option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.code}>
                      {b.name}
                    </option>
                  ))}
                </select>
                {errors.branchCode && (
                  <p className="mt-1.5 text-xs text-red-500">
                    {errors.branchCode.message}
                  </p>
                )}
              </div>
            </div>

            {/* Year, Semester & Enrollment */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="year">Year</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <select
                    id="year"
                    className="flex h-10 w-full rounded-lg border border-gray-200 bg-white pl-10 pr-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 hover:border-gray-300 transition-all appearance-none cursor-pointer"
                    onChange={(e) =>
                      setValue("year", parseInt(e.target.value, 10), {
                        shouldValidate: true,
                        shouldDirty: true,
                      })
                    }
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Select
                    </option>
                    <option value="1">Year 1</option>
                    <option value="2">Year 2</option>
                    <option value="3">Year 3</option>
                    <option value="4">Year 4</option>
                  </select>
                  {errors.year && (
                    <p className="mt-1.5 text-xs text-red-500">
                      {errors.year.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="semester">Semester</Label>
                <div className="relative">
                  <select
                    id="semester"
                    className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                    onChange={(e) =>
                      setValue("semester", parseInt(e.target.value, 10), {
                        shouldValidate: true,
                        shouldDirty: true,
                      })
                    }
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Select
                    </option>
                    {semesterOptions.map((semester) => (
                      <option key={semester.value} value={semester.value}>
                        Semester {semester.value}
                      </option>
                    ))}
                  </select>
                  {errors.semester && (
                    <p className="mt-1.5 text-xs text-red-500">
                      {errors.semester.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="enrollmentNumber">Enrollment No.</Label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="enrollmentNumber"
                    placeholder="R2142210XXX"
                    className="pl-10"
                    error={errors.enrollmentNumber?.message}
                    {...register("enrollmentNumber")}
                  />
                </div>
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full"
              size="lg"
              isLoading={isSubmitting}
            >
              Create Account
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white/90 px-2 text-gray-400">or</span>
            </div>
          </div>

          {/* Google */}
          <Button variant="outline" className="w-full" size="lg" disabled>
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </Button>

          {/* Login link */}
          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-brand-600 hover:text-brand-700"
            >
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
