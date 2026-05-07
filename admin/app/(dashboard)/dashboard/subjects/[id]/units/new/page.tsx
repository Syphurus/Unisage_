"use client";

import { useParams, useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UnitForm } from "@/components/forms/UnitForm";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { useSubject } from "@/lib/hooks/useSubjects";

export default function NewUnitPage() {
  const params = useParams();
  const router = useRouter();
  const subjectId = params.id as string;
  const { subject, isLoading } = useSubject(subjectId);

  if (isLoading) return <PageLoader />;
  if (!subject) return null;

  return (
    <div>
      <TopBar title="New Unit" />

      <div className="p-6 space-y-6">
        <Breadcrumb
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Subjects", href: "/dashboard/subjects" },
            {
              label: subject.name,
              href: `/dashboard/subjects/${subjectId}`,
            },
            { label: "New Unit" },
          ]}
        />

        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Create Unit for {subject.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <UnitForm
              subjectId={subjectId}
              onSuccess={() => router.push(`/dashboard/subjects/${subjectId}`)}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
