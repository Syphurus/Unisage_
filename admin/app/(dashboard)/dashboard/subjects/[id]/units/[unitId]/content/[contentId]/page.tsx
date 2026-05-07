"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { TopBar } from "@/components/layout/TopBar";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useContent } from "@/lib/hooks/useContent";
import { api } from "@/lib/api";
import { Trash2, Edit } from "lucide-react";

export default function ContentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const subjectId = params.id as string;
  const unitId = params.unitId as string;
  const contentId = params.contentId as string;

  const { content, isLoading } = useContent(contentId);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await api.delete(`/admin/content/${contentId}`);
      if (!res.success) {
        toast.error(res.error?.message || "Failed to delete content");
        return;
      }
      toast.success("Content deleted");
      router.push(`/dashboard/subjects/${subjectId}/units/${unitId}`);
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  if (isLoading) return <PageLoader />;
  if (!content) return null;

  return (
    <div>
      <TopBar title={content.title || "Content"}>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="capitalize">
            {content.type}
          </Badge>
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
            {
              label: "Subject",
              href: `/dashboard/subjects/${subjectId}`,
            },
            {
              label: "Unit",
              href: `/dashboard/subjects/${subjectId}/units/${unitId}`,
            },
            { label: content.title || "Content" },
          ]}
        />

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <CardTitle>{content.title || "Content"}</CardTitle>
              <Badge variant="secondary">
                {content.type === "long_notes"
                  ? "Long Notes"
                  : content.type === "short_notes"
                    ? "Short Notes"
                    : content.type === "flashcard"
                      ? "Flashcards"
                      : content.type === "quiz"
                        ? "Quiz"
                        : content.type}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {content.type === "long_notes" || content.type === "short_notes" ? (
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{
                  __html:
                    (content.data as Record<string, string>)?.html ||
                    (content.data as Record<string, string>)?.content ||
                    "",
                }}
              />
            ) : (
              <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 rounded-lg p-4 overflow-auto">
                {JSON.stringify(content.data, null, 2)}
              </pre>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Content"
        description="This will permanently delete this content item. This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
