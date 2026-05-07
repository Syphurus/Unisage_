"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { authAPI, metaAPI } from "@/lib/api";
import { useAuth } from "@/lib/hooks/useAuth";
import { toast } from "sonner";
import { getSemestersForYear } from "@/lib/constants";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();

  const [collegeCode, setCollegeCode] = useState(user?.collegeCode || "");
  const [branchCode, setBranchCode] = useState(user?.branchCode || "");
  const [year, setYear] = useState<number>(user?.year || 1);
  const [semester, setSemester] = useState<number>(user?.semester || 1);
  const [enrollmentNumber, setEnrollmentNumber] = useState(
    user?.enrollmentNumber || ""
  );
  const [loading, setLoading] = useState(false);

  const [colleges, setColleges] = useState<
    Array<{ id: string; name: string; code: string }>
  >([]);
  const [branches, setBranches] = useState<
    Array<{ id: string; name: string; code: string }>
  >([]);
  const semesterOptions = getSemestersForYear(year);

  useEffect(() => {
    async function loadColleges() {
      try {
        const res = await metaAPI.getColleges();
        setColleges(res.data || []);
      } catch {
        setColleges([]);
      }
    }
    loadColleges();
  }, []);

  useEffect(() => {
    if (
      semesterOptions.length > 0 &&
      !semesterOptions.some((option) => option.value === semester)
    ) {
      setSemester(semesterOptions[0].value);
    }
  }, [semester, semesterOptions]);

  useEffect(() => {
    async function loadBranches() {
      if (!collegeCode) {
        setBranches([]);
        return;
      }
      try {
        const res = await metaAPI.getBranches(collegeCode);
        setBranches(res.data || []);
      } catch {
        setBranches([]);
      }
    }
    loadBranches();
  }, [collegeCode]);

  async function onSave() {
    if (!collegeCode || !branchCode || !year || !semester) {
      toast.error("Please fill college, branch, year and semester");
      return;
    }

    setLoading(true);
    try {
      await authAPI.updateProfile({
        collegeCode,
        branchCode,
        year,
        semester,
        enrollmentNumber,
      });
      await refreshUser();
      toast.success("Profile updated");
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err?.error?.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Complete your profile</CardTitle>
          <CardDescription>
            Select your college details to unlock the correct subjects for your
            semester.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>College</Label>
              <select
                className="h-10 w-full rounded border border-gray-200 px-3"
                value={collegeCode}
                onChange={(e) => {
                  setCollegeCode(e.target.value);
                  setBranchCode("");
                }}
              >
                <option value="">Select college</option>
                {colleges.map((c) => (
                  <option key={c.id} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Branch</Label>
              <select
                className="h-10 w-full rounded border border-gray-200 px-3"
                value={branchCode}
                onChange={(e) => setBranchCode(e.target.value)}
              >
                <option value="">Select branch</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.code}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Year</Label>
              <select
                className="h-10 w-full rounded border border-gray-200 px-3"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value, 10))}
              >
                {[1, 2, 3, 4].map((y) => (
                  <option key={y} value={y}>
                    Year {y}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Semester</Label>
              <select
                className="h-10 w-full rounded border border-gray-200 px-3"
                value={semester}
                onChange={(e) => setSemester(parseInt(e.target.value, 10))}
              >
                {semesterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    Semester {option.value}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Enrollment Number</Label>
            <Input
              value={enrollmentNumber || ""}
              onChange={(e) => setEnrollmentNumber(e.target.value)}
              placeholder="Enter enrollment number"
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={onSave} disabled={loading}>
              {loading ? "Saving..." : "Save and Continue"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
