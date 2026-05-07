"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useMemo, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NotesEditor } from "@/components/forms/NotesEditor";
import { JsonContentForm } from "@/components/forms/JsonContentForm";
import { ArrowLeft } from "lucide-react";
import PyqsForm from "@/components/forms/PyqsForm";
import { api } from "@/lib/api";

const contentTypes = {
  long_notes: { label: "Long Notes", kind: "notes" },
  short_notes: { label: "Short Notes", kind: "notes" },
  flashcard: { label: "Flashcards", kind: "json" },
  quiz: { label: "Quizzes", kind: "json" },
  paper_predictor: { label: "Paper Predictor", kind: "json" },
  exam_tips: { label: "Exam Tips", kind: "json" },
  pyqs: { label: "PYQs", kind: "pyqs" },
  syllabus: { label: "Syllabus", kind: "pyqs" },
  assignments: { label: "Assignments", kind: "pyqs" },
} as const;

export default function SubjectContentNewPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const subjectId = params.id as string;
  const type = (searchParams.get("type") ||
    "long_notes") as keyof typeof contentTypes;
  const contentId = searchParams.get("id") || null;

  const [editingContent, setEditingContent] = useState<null | any>(null);

  // If editing, fetch existing content
  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!contentId) return;
      try {
        const res = await api.get(`/admin/content/${contentId}`);
        const payload = res as any;
        if (!mounted) return;
        setEditingContent(payload?.data || payload?.data?.data || null);
      } catch (e) {
        setEditingContent(null);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [contentId]);

  const config = useMemo(
    () => contentTypes[type] || contentTypes.long_notes,
    [type]
  );
  const title = `${config.label} Editor`;

  const onSuccess = () => {
    router.push(`/dashboard/subjects/${subjectId}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link href={`/dashboard/subjects/${subjectId}`}>
            <Button
              variant="ghost"
              size="sm"
              className="px-0 text-gray-500 hover:text-gray-900"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to subject
            </Button>
          </Link>
          <h1 className="mt-3 text-2xl font-bold text-gray-900">{title}</h1>
          <p className="mt-1 text-sm text-gray-500">
            Save content directly under this subject. No unit selection is
            required.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{config.label}</CardTitle>
        </CardHeader>
        <CardContent>
          {config.kind === "notes" ? (
            <NotesEditor
              subjectId={subjectId}
              noteType={type as "long_notes" | "short_notes"}
              initialData={
                editingContent
                  ? {
                      id: editingContent.id,
                      title: editingContent.title,
                      content:
                        (editingContent.data &&
                          (editingContent.data.html ||
                            editingContent.data.content)) ||
                        "",
                    }
                  : undefined
              }
              onSuccess={onSuccess}
            />
          ) : config.kind === "pyqs" ? (
            <PyqsForm
              contentType={type}
              content={editingContent}
              onSubmit={async (formData) => {
                formData.append("subjectId", subjectId);
                formData.append("isPublished", "true");
                try {
                  if (editingContent && editingContent.id) {
                    // Update existing content (PUT supports FormData now)
                    const response = await api.put(
                      `/admin/content/${editingContent.id}`,
                      formData
                    );
                    if (!response.success)
                      throw new Error(
                        response.error?.message || "Failed to update content"
                      );
                  } else {
                    const response = await api.post("/admin/content", formData);
                    if (!response.success)
                      throw new Error(
                        response.error?.message || "Failed to create content"
                      );
                  }
                  onSuccess();
                } catch (err) {
                  throw err;
                }
              }}
              onCancel={() => router.push(`/dashboard/subjects/${subjectId}`)}
            />
          ) : (
            <JsonContentForm
              subjectId={subjectId}
              type={type}
              initialData={
                editingContent
                  ? {
                      id: editingContent.id,
                      title: editingContent.title,
                      data: editingContent.data,
                    }
                  : undefined
              }
              onSuccess={onSuccess}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
