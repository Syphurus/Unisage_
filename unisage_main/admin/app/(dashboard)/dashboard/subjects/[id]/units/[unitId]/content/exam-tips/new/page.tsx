"use client";

import { useParams, useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import JsonContentForm from "@/components/forms/JsonContentForm";

export default function NewExamTipsPage() {
  const params = useParams();
  const router = useRouter();
  const subjectId = params.id as string;
  const unitId = params.unitId as string;

  return (
    <div>
      <TopBar title="New Exam Tips" />

      <div className="p-6 space-y-6">
        <Breadcrumb
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Subjects", href: "/dashboard/subjects" },
            { label: "Subject", href: `/dashboard/subjects/${subjectId}` },
            {
              label: "Unit",
              href: `/dashboard/subjects/${subjectId}/units/${unitId}`,
            },
            { label: "New Exam Tips" },
          ]}
        />

        <Card>
          <CardHeader>
            <CardTitle>Create Exam Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <JsonContentForm
              unitId={unitId}
              type="exam_tips"
              onSuccess={() =>
                router.push(`/dashboard/subjects/${subjectId}/units/${unitId}`)
              }
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
