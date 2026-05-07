"use client";

import { useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SubjectForm } from "@/components/forms/SubjectForm";

export default function NewSubjectPage() {
  const router = useRouter();

  return (
    <div>
      <TopBar title="New Subject" />

      <div className="p-6 space-y-6">
        <Breadcrumb
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Subjects", href: "/dashboard/subjects" },
            { label: "New Subject" },
          ]}
        />

        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Create Subject</CardTitle>
          </CardHeader>
          <CardContent>
            <SubjectForm
              onSuccess={() => router.push("/dashboard/subjects")}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
