"use client";

import { useParams, useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NotesEditor } from "@/components/forms/NotesEditor";

export default function NewNotesPage() {
  const params = useParams();
  const router = useRouter();
  const subjectId = params.id as string;
  const unitId = params.unitId as string;

  return (
    <div>
      <TopBar title="New Long Notes" />

      <div className="p-6 space-y-6">
        <Breadcrumb
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Subjects", href: "/dashboard/subjects" },
            {
              label: "Subject",
              href: `/dashboard/subjects/${subjectId}`,
            },
            {
              label: "Unit",
              href: `/dashboard/subjects/${subjectId}/units/${unitId}`,
            },
            { label: "New Long Notes" },
          ]}
        />

        <Card>
          <CardHeader>
            <CardTitle>Create Long Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <NotesEditor
              unitId={unitId}
              noteType="long_notes"
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
