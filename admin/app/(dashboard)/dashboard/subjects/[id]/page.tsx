"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { TopBar } from "@/components/layout/TopBar";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import ContentManagementList from "@/components/content/ContentManagementList";
import { useSubject } from "@/lib/hooks/useSubjects";
import { api } from "@/lib/api";
import { yearLabel, semesterLabel } from "@/lib/utils";
import { Edit, Trash2, Plus, FileText } from "lucide-react";

type ContentGroup = {
  id: string;
  title: string | null;
  data: Record<string, any>;
  orderIndex: number;
  isPublished?: boolean;
  createdAt: string;
  unit?: { id: string; title: string } | null;
};

type SubjectContentResponse = {
  subject: {
    id: string;
    name: string;
    code: string;
    year: number;
    semester: number;
  };
  content: Record<string, ContentGroup[]>;
  counts: Record<string, number>;
};

const categories = [
  { key: "long_notes", label: "Long Notes" },
  { key: "short_notes", label: "Short Notes" },
  { key: "flashcard", label: "Flashcards" },
  { key: "quiz", label: "Quizzes" },
  { key: "paper_predictor", label: "Paper Predictor" },
  { key: "exam_tips", label: "Exam Tips" },
  { key: "pyqs", label: "PYQs" },
  { key: "syllabus", label: "Syllabus" },
  { key: "assignments", label: "Assignments" },
] as const;

export default function SubjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { subject, isLoading, mutate } = useSubject(id);
  const [subjectContent, setSubjectContent] =
    useState<SubjectContentResponse | null>(null);
  const [contentLoading, setContentLoading] = useState(true);
  const [predictorVisible, setPredictorVisible] = useState(true);
  const [savingPredictorVisible, setSavingPredictorVisible] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await api.get(`/admin/subjects/${id}/content`);
        const payload = res as any;
        const batched = payload?.data || payload?.data?.data || null;
        if (!mounted) return;

        setSubjectContent(batched);
        setPredictorVisible(subject?.predictorVisible !== false);
      } catch (e) {
        if (mounted) setSubjectContent(null);
      }
      if (mounted) setContentLoading(false);
    }
    load();
    return () => {
      mounted = false;
    };
  }, [id, subject?.predictorVisible]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const contentBuckets = useMemo(() => {
    const content = subjectContent?.content || {};
    return categories.map((category) => ({
      ...category,
      items: (content[category.key] || []) as ContentGroup[],
      count:
        subjectContent?.counts?.[category.key] ||
        (content[category.key] || []).length ||
        0,
    }));
  }, [subjectContent]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await api.delete(`/admin/subjects/${id}`);
      if (!res.success) {
        toast.error(res.error?.message || "Failed to delete subject");
        return;
      }
      toast.success("Subject deleted");
      router.push("/dashboard/subjects");
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  const handlePredictorToggle = async (checked: boolean) => {
    setPredictorVisible(checked);
    setSavingPredictorVisible(true);

    try {
      const res = await api.put(`/admin/subjects/${id}`, {
        predictorVisible: checked,
      });

      if (!res.success) {
        throw new Error(
          res.error?.message || "Failed to update predictor visibility"
        );
      }

      mutate();
      toast.success(
        checked ? "Paper Predictor enabled" : "Marked as Coming Soon"
      );
    } catch {
      setPredictorVisible(!checked);
      toast.error("Failed to update predictor visibility");
    } finally {
      setSavingPredictorVisible(false);
    }
  };

  if (isLoading) return <PageLoader />;
  if (!subject) {
    return (
      <div className="p-6">
        <EmptyState
          title="Subject not found"
          description="The subject you're looking for doesn't exist."
          action={{
            label: "Back to Subjects",
            onClick: () => router.push("/dashboard/subjects"),
          }}
        />
      </div>
    );
  }

  return (
    <div>
      <TopBar title={subject.name}>
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/subjects/${id}/edit`}>
            <Button variant="outline" size="sm">
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </TopBar>

      <div className="p-6 space-y-6">
        <Breadcrumb
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Subjects", href: "/dashboard/subjects" },
            { label: subject.name },
          ]}
        />

        {/* Subject info */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <InfoItem label="Code" value={subject.code} />
              <InfoItem label="Year" value={yearLabel(subject.year)} />
              <InfoItem
                label="Semester"
                value={semesterLabel(subject.semester)}
              />
              <InfoItem
                label="Credits"
                value={subject.credits?.toString() || "—"}
              />
            </div>
            {subject.description && (
              <p className="mt-4 text-sm text-gray-600 border-t pt-4">
                {subject.description}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Paper Predictor visibility
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Toggle whether this subject shows predictor cards or the Coming Soon card in the student app.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700">
                  {predictorVisible ? "Shown" : "Coming Soon"}
                </span>
                <Switch
                  checked={predictorVisible}
                  onCheckedChange={handlePredictorToggle}
                  disabled={savingPredictorVisible}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Content</h2>
            <p className="text-sm text-gray-500">
              Everything lives under this subject. Add notes, quizzes,
              flashcards, and more directly here.
            </p>
          </div>
        </div>

        {contentLoading ? (
          <PageLoader />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {contentBuckets.map((category) => (
              <Card key={category.key} className="h-full">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {category.label}
                      </p>
                      <p className="text-xs text-gray-500">
                        {category.count} item{category.count === 1 ? "" : "s"}
                      </p>
                    </div>
                    <Badge variant="outline">{category.key}</Badge>
                  </div>

                  <div className="space-y-2">
                    <ContentManagementList
                      contents={category.items}
                      contentType={category.key}
                      onEdit={(content) =>
                        router.push(
                          `/dashboard/subjects/${id}/content/new?type=${category.key}&id=${content.id}`
                        )
                      }
                      onDelete={async (contentId) => {
                        try {
                          await api.delete(`/admin/content/${contentId}`);
                          // refresh content list
                          const res = await api.get(
                            `/admin/subjects/${id}/content`
                          );
                          const payload = res as any;
                          setSubjectContent(
                            payload?.data || payload?.data?.data || null
                          );
                        } catch (err) {
                          // eslint-disable-next-line no-console
                          console.error("Failed to delete content", err);
                        }
                      }}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Link
                      href={`/dashboard/subjects/${id}/content/new?type=${category.key}`}
                    >
                      <Button size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Add
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Subject"
        description="This will permanently delete this subject and all its content. This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-gray-900">{value}</p>
    </div>
  );
}
