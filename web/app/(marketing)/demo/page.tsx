"use client";

/**
 * Demo / "Skip" entry point.
 *
 * Lets a brand-new user land on the dashboard after only choosing a college
 * and semester. Used as the fast path from the marketing landing page's
 * "Skip · view demo" CTA so people can poke around without going through
 * the full multi-step signup.
 *
 * Under the hood it still creates a real account (random throwaway email
 * + password) so the rest of the app - which assumes there's a logged-in
 * user - keeps working. Branch defaults to "CSE" because the demo doesn't
 * collect it; the user can change it later on /profile.
 *
 * A Google sign-in button is shown alongside as a hand-off to the proper
 * auth flow. Backend Google OAuth wiring is pending, so the button just
 * routes to /signup for now (and explains that in a toast).
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, ChevronLeft, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/hooks/useAuth";
import { metaAPI } from "@/lib/api";
import { Pill, PrimaryButton } from "@/components/unisage/primitives";
import { cn } from "@/lib/utils";
import { SPECIALIZATIONS, specializationLabel } from "@/lib/specializations";

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

function randomDemoIdentity() {
  const suffix = Math.random().toString(36).slice(2, 10);
  return {
    email: `demo_${suffix}@example.com`,
    password: `Demo1${suffix.toLowerCase()}!`,
    fullName: "Demo Student",
    enrollmentNumber: `DEMO${suffix.toUpperCase()}`,
  };
}

export default function DemoEntryPage() {
  const router = useRouter();
  const { signup } = useAuth();

  const [colleges, setColleges] = useState<College[]>([]);
  const [collegeCode, setCollegeCode] = useState<string>("");
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
    if (!collegeCode) {
      setBranches([]);
      return;
    }
    metaAPI
      .getBranches(collegeCode)
      .then((res: any) => {
        const list = (res?.data ?? res ?? []) as Branch[];
        setBranches(list);
        setBranchCode(list[0]?.code || "");
      })
      .catch(() => setBranches([]));
  }, [collegeCode]);

  useEffect(() => {
    if (semester < 4) setSpecialization("");
  }, [semester]);

  const canContinue =
    !!collegeCode &&
    !!branchCode &&
    semester > 0 &&
    (semester < 4 || !!specialization) &&
    !submitting;

  const handleContinue = async () => {
    if (!canContinue) return;
    setSubmitting(true);
    try {
      const id = randomDemoIdentity();
      await signup({
        ...id,
        collegeCode,
        branchCode,
        year: Math.ceil(semester / 2),
        semester,
        specialization: semester >= 4 ? specialization : null,
      } as any);
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e.message || "Could not start demo. Please try signup.");
      setSubmitting(false);
    }
  };

  const handleGoogle = () => {
    toast.message("Google sign-in is coming soon - opening signup instead.");
    router.push("/signup");
  };

  return (
    <div className="min-h-screen pb-32">
      <header className="flex items-center justify-between px-5 pt-5">
        <Link
          href="/"
          aria-label="Back"
          className="-ml-2 grid h-9 w-9 place-items-center rounded-full text-[rgb(var(--fg))] hover:bg-white/[0.05]"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <Pill variant="mint">
          <Sparkles className="h-3 w-3" />
          Quick demo
        </Pill>
        <span className="h-9 w-9" aria-hidden />
      </header>

      <div className="mx-auto max-w-2xl px-5 pt-8 md:px-8 md:pt-12">
        <h1 className="text-[34px] md:text-[44px] font-bold leading-[1.05] tracking-[-0.01em] text-[rgb(var(--fg))]">
          Two picks and you&apos;re in.
        </h1>
        <p className="mt-3 max-w-[42ch] text-[14px] text-chalk-400">
          We just need your college and semester to load the right syllabus.
          Skip the rest - you can fill in the profile later.
        </p>

        <button
          type="button"
          onClick={handleGoogle}
          className="mt-7 flex w-full items-center justify-center gap-3 rounded-[12px] border border-white/[0.08] bg-[rgb(var(--bg-elev))] px-4 py-3.5 text-[14px] font-medium text-[rgb(var(--fg))] hover:bg-[rgb(var(--bg-subtle))] transition-colors"
        >
          <GoogleGlyph />
          Continue with Google
        </button>

        <div className="my-6 flex items-center gap-3 text-[11px] uppercase tracking-cap text-chalk-500">
          <span className="h-px flex-1 bg-white/[0.06]" />
          or pick manually
          <span className="h-px flex-1 bg-white/[0.06]" />
        </div>

        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-cap text-chalk-500">
            College
          </p>
          <div className="space-y-2">
            {colleges.length === 0 ? (
              <p className="text-[13px] text-chalk-400">Loading colleges...</p>
            ) : (
              colleges.map((c) => {
                const active = collegeCode === c.code;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCollegeCode(c.code)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-[12px] border px-4 py-3 text-left transition-colors",
                      active
                        ? "border-mint-500 bg-mint-500/10"
                        : "border-white/[0.08] bg-[rgb(var(--bg-elev))] hover:bg-[rgb(var(--bg-subtle))]"
                    )}
                  >
                    <span className="text-[14px] font-medium text-[rgb(var(--fg))]">
                      {c.name}
                    </span>
                    {active && (
                      <span className="text-[12px] text-mint-400">
                        Selected
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="mt-6">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-cap text-chalk-500">
            Semester
          </p>
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => {
              const active = semester === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSemester(s)}
                  className={cn(
                    "rounded-[12px] border py-2.5 text-[14px] font-semibold transition-colors",
                    active
                      ? "border-mint-500 bg-mint-500 text-ink-950"
                      : "border-white/[0.1] text-chalk-300 hover:border-white/[0.2]"
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
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-cap text-chalk-500">
              Specialization
            </p>
            <div className="space-y-2">
              {SPECIALIZATIONS.map((item) => {
                const active = specialization === item.code;
                return (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => setSpecialization(item.code)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-[12px] border px-4 py-3 text-left transition-colors",
                      active
                        ? "border-mint-500 bg-mint-500/10"
                        : "border-white/[0.08] bg-[rgb(var(--bg-elev))] hover:bg-[rgb(var(--bg-subtle))]"
                    )}
                  >
                    <span className="text-[13px] font-medium text-[rgb(var(--fg))]">
                      {item.label}
                    </span>
                    {active && (
                      <span className="text-[12px] text-mint-400">
                        Selected
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {collegeCode && branchCode && (
          <div className="mt-6 rounded-card border border-white/[0.06] bg-[rgb(var(--bg-elev))] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-cap text-mint-400">
              Demo profile ready
            </p>
            <p className="mt-1.5 text-[13px] text-chalk-300">
              {colleges.find((c) => c.code === collegeCode)?.name} ·{" "}
              {branchCode} · Sem {semester || "-"}
              {semester >= 4 && specialization
                ? ` · ${specializationLabel(specialization)}`
                : ""}
            </p>
          </div>
        )}

        <p className="mt-6 text-[12px] text-chalk-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-mint-400">
            Sign in
          </Link>
        </p>
      </div>

      <div className="sticky-cta">
        <PrimaryButton
          type="button"
          disabled={!canContinue}
          onClick={handleContinue}
        >
          {submitting ? "Loading demo..." : "Enter mission control"}{" "}
          <ArrowRight className="h-4 w-4" />
        </PrimaryButton>
      </div>
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}
