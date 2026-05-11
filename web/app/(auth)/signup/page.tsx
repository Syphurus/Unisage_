"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { metaAPI } from "@/lib/api";
import { toast } from "sonner";
import { ArrowRight, Check, ChevronLeft, Eye, EyeOff } from "lucide-react";
import { Pill, PrimaryButton } from "@/components/unisage/primitives";
import { useTheme } from "@/lib/hooks/useTheme";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { SPECIALIZATIONS, specializationLabel } from "@/lib/specializations";

type Step = 1 | 2 | 3;

interface College {
  id: string;
  name: string;
  code: string;
}
interface Branch {
  id: string;
  name: string;
  code: string;
}

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [step, setStep] = useState<Step>(1);

  // Step 1: identity
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [enrollment, setEnrollment] = useState("");

  // Step 2: institution
  const [colleges, setColleges] = useState<College[]>([]);
  const [collegeCode, setCollegeCode] = useState<string>("");

  // Step 3: branch + semester
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchCode, setBranchCode] = useState<string>("");
  const [semester, setSemester] = useState<number>(0);
  const [specialization, setSpecialization] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    metaAPI
      .getColleges()
      .then((res: any) => {
        const list = (res?.data ?? res ?? []) as College[];
        setColleges(list);
      })
      .catch(() => setColleges([]));
  }, []);

  useEffect(() => {
    if (!collegeCode) return;
    metaAPI
      .getBranches(collegeCode)
      .then((res: any) => {
        const list = (res?.data ?? res ?? []) as Branch[];
        setBranches(list);
      })
      .catch(() => setBranches([]));
  }, [collegeCode]);

  useEffect(() => {
    if (semester < 4) setSpecialization("");
  }, [semester]);

  const yearFromSemester = (sem: number) => Math.ceil(sem / 2);

  const canContinue =
    step === 1
      ? fullName.length >= 2 &&
        email.includes("@") &&
        password.length >= 8 &&
        enrollment.length > 0
      : step === 2
        ? !!collegeCode
        : !!branchCode &&
          semester > 0 &&
          (semester < 4 || !!specialization);

  const onContinue = async () => {
    if (!canContinue) return;
    if (step === 1) setStep(2);
    else if (step === 2) setStep(3);
    else {
      setSubmitting(true);
      try {
        await signup({
          fullName,
          email,
          password,
          collegeCode,
          branchCode,
          year: yearFromSemester(semester),
          semester,
          specialization: semester >= 4 ? specialization : null,
          enrollmentNumber: enrollment,
        } as any);
        toast.success("Welcome to UniSage.");
      } catch (err) {
        const e = err as { message?: string };
        toast.error(e.message || "Signup failed");
      } finally {
        setSubmitting(false);
      }
    }
  };

  const onBack = () => {
    if (step === 1) router.push("/");
    else setStep((s) => (s - 1) as Step);
  };

  return (
    <div className="min-h-screen pb-32">
      <header className="flex items-center justify-between px-5 pt-5">
        <button
          onClick={onBack}
          aria-label="Back"
          className="-ml-2 grid h-9 w-9 place-items-center rounded-full text-[rgb(var(--fg))] hover:bg-white/[0.05]"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        {/* Step progress segments */}
        <div className="flex flex-1 items-center justify-center gap-2 px-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={cn(
                "h-[2px] flex-1 rounded-full transition-colors",
                n <= step ? "bg-mint-400" : "bg-white/10",
              )}
            />
          ))}
        </div>

        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="grid h-9 w-9 place-items-center rounded-full text-chalk-300 hover:bg-white/[0.05]"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>
      </header>

      <div className="px-5 pt-7 md:px-8">
        <Pill variant="mint" className="mb-4">
          Step {step} of 3
        </Pill>

        {/* Step 1 — Identity */}
        {step === 1 && (
          <>
            <h1 className="text-[36px] font-bold leading-[1.05] tracking-[-0.01em] text-[rgb(var(--fg))]">
              Get inside,
              <br />
              quickly.
            </h1>
            <p className="mt-3 max-w-[34ch] text-[14px] text-chalk-400">
              No long forms. We pull your subject list once.
            </p>

            <div className="mt-7 space-y-4">
              <Field
                label="Name"
                value={fullName}
                onChange={setFullName}
                placeholder="Your name"
              />
              <Field
                label="Email"
                value={email}
                onChange={setEmail}
                placeholder="you@college.edu"
                type="email"
              />
              <div>
                <label className="mb-2 block text-[10px] font-semibold uppercase tracking-cap text-chalk-500">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPwd ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="8+ chars · 1 upper · 1 number"
                    className="w-full rounded-[12px] border border-white/[0.08] bg-[rgb(var(--bg-elev))] px-4 py-3.5 pr-11 text-[15px] text-[rgb(var(--fg))] placeholder:text-chalk-500 focus:border-mint-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 grid h-9 w-9 place-items-center text-chalk-400 hover:text-[rgb(var(--fg))]"
                    aria-label="Toggle password"
                  >
                    {showPwd ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <Field
                label="Enrollment number"
                value={enrollment}
                onChange={setEnrollment}
                placeholder="e.g. 21CS3001"
              />

              <p className="pt-2 text-center text-[13px] text-chalk-400">
                Already have an account?{" "}
                <Link href="/login" className="font-medium text-mint-400">
                  Sign in
                </Link>
              </p>
            </div>
          </>
        )}

        {/* Step 2 — Institution */}
        {step === 2 && (
          <>
            <h1 className="text-[36px] font-bold leading-[1.05] tracking-[-0.01em] text-[rgb(var(--fg))]">
              Where are you
              <br />
              studying?
            </h1>
            <div className="mt-7 space-y-2.5">
              {colleges.length === 0 ? (
                <p className="text-[13px] text-chalk-400">
                  Loading colleges...
                </p>
              ) : (
                colleges.map((c) => {
                  const active = collegeCode === c.code;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setCollegeCode(c.code)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-[12px] border px-4 py-3.5 text-left transition-colors",
                        active
                          ? "border-mint-500 bg-mint-500/10"
                          : "border-white/[0.08] bg-[rgb(var(--bg-elev))] hover:bg-[rgb(var(--bg-subtle))]",
                      )}
                    >
                      <span className="text-[14px] font-medium text-[rgb(var(--fg))]">
                        {c.name}
                      </span>
                      {active && (
                        <Check className="h-4 w-4 text-mint-400" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* Step 3 — Branch + Semester */}
        {step === 3 && (
          <>
            <h1 className="text-[36px] font-bold leading-[1.05] tracking-[-0.01em] text-[rgb(var(--fg))]">
              Last bit.
            </h1>
            <p className="mt-3 text-[14px] text-chalk-400">
              We&apos;ll auto-detect your subjects.
            </p>

            <div className="mt-7">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-cap text-chalk-500">
                Branch
              </p>
              <div className="flex flex-wrap gap-2">
                {branches.length === 0 ? (
                  <p className="text-[13px] text-chalk-400">
                    Loading branches...
                  </p>
                ) : (
                  branches.map((b) => {
                    const active = branchCode === b.code;
                    return (
                      <button
                        key={b.id}
                        onClick={() => setBranchCode(b.code)}
                        className={cn(
                          "rounded-pill border px-4 py-1.5 text-[12px] font-medium transition-colors",
                          active
                            ? "border-mint-500 bg-mint-500 text-ink-950"
                            : "border-white/[0.1] text-chalk-300 hover:border-white/[0.2]",
                        )}
                      >
                        {b.code}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="mt-6">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-cap text-chalk-500">
                Semester
              </p>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => {
                  const active = semester === s;
                  return (
                    <button
                      key={s}
                      onClick={() => setSemester(s)}
                      className={cn(
                        "rounded-[12px] border py-2.5 text-[14px] font-semibold transition-colors",
                        active
                          ? "border-mint-500 bg-mint-500 text-ink-950"
                          : "border-white/[0.1] text-chalk-300 hover:border-white/[0.2]",
                      )}
                    >
                      Sem {s}
                    </button>
                  );
                })}
              </div>
            </div>

            {semester >= 4 && (
              <div className="mt-6">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-cap text-chalk-500">
                  Specialization
                </p>
                <div className="space-y-2">
                  {SPECIALIZATIONS.map((item) => {
                    const active = specialization === item.code;
                    return (
                      <button
                        key={item.code}
                        onClick={() => setSpecialization(item.code)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-[12px] border px-4 py-3 text-left transition-colors",
                          active
                            ? "border-mint-500 bg-mint-500/10"
                            : "border-white/[0.08] bg-[rgb(var(--bg-elev))] hover:bg-[rgb(var(--bg-subtle))]",
                        )}
                      >
                        <span className="text-[13px] font-medium text-[rgb(var(--fg))]">
                          {item.label}
                        </span>
                        {active && (
                          <Check className="h-4 w-4 shrink-0 text-mint-400" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {!!branchCode && !!collegeCode && !!semester && (
              <div className="mt-6 rounded-card border border-white/[0.06] bg-[rgb(var(--bg-elev))] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-cap text-mint-400">
                  Loading your syllabus
                </p>
                <p className="mt-1.5 text-[13px] text-chalk-300">
                  {colleges.find((c) => c.code === collegeCode)?.name} ·{" "}
                  {branchCode} · Sem {semester}
                  {semester >= 4 && specialization
                    ? ` · ${specializationLabel(specialization)}`
                    : ""}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <div className="sticky-cta">
        <PrimaryButton
          type="button"
          disabled={!canContinue || submitting}
          onClick={onContinue}
        >
          {step === 3
            ? submitting
              ? "Loading..."
              : "Enter mission control"
            : "Continue"}{" "}
          <ArrowRight className="h-4 w-4" />
        </PrimaryButton>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-[10px] font-semibold uppercase tracking-cap text-chalk-500">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-[12px] border border-white/[0.08] bg-[rgb(var(--bg-elev))] px-4 py-3.5 text-[15px] text-[rgb(var(--fg))] placeholder:text-chalk-500 focus:border-mint-500 focus:outline-none"
      />
    </div>
  );
}
