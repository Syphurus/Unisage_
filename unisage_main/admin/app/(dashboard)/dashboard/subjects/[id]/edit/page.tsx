"use client";

import { useParams, useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SubjectForm } from "@/components/forms/SubjectForm";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { useSubject } from "@/lib/hooks/useSubjects";

export default function EditSubjectPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { subject, isLoading, mutate } = useSubject(id);

  if (isLoading) return <PageLoader />;
  if (!subject) return null;

  return (
    <div>
      <TopBar title={`Edit: ${subject.name}`} />

      <div className="p-6 space-y-6">
        <Breadcrumb
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Subjects", href: "/dashboard/subjects" },
            { label: subject.name, href: `/dashboard/subjects/${id}` },
            { label: "Edit" },
          ]}
        />

        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Edit Subject</CardTitle>
          </CardHeader>
          <CardContent>
            <SubjectForm
              initialData={{ ...subject, id }}
              onSuccess={() => {
                mutate();
                router.push(`/dashboard/subjects/${id}`);
              }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
