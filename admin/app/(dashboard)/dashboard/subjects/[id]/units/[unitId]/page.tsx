"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { TopBar } from "@/components/layout/TopBar";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useUnit, useUnitContent } from "@/lib/hooks/useUnits";
import { api } from "@/lib/api";
import {
  Edit,
  Trash2,
  Plus,
  FileText,
  BookOpen,
  Brain,
  HelpCircle,
} from "lucide-react";

export default function UnitDetailPage() {
  const params = useParams();
  const router = useRouter();
  const subjectId = params.id as string;
  const unitId = params.unitId as string;

  const { unit, isLoading: unitLoading } = useUnit(unitId);
  const { content, isLoading: contentLoading } = useUnitContent(unitId);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isLoading = unitLoading || contentLoading;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await api.delete(`/admin/units/${unitId}`);
      if (!res.success) {
        toast.error(res.error?.message || "Failed to delete unit");
        return;
      }
      toast.success("Unit deleted");
      router.push(`/dashboard/subjects/${subjectId}`);
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  if (isLoading) return <PageLoader />;
  if (!unit) return null;

  const longNotes = content?.content?.long_notes || [];
  const shortNotes = content?.content?.short_notes || [];
  const flashcards = content?.content?.flashcard || [];
  const quizzes = content?.content?.quiz || [];
  const paperPredictors = content?.content?.paper_predictor || [];
  const examTips = content?.content?.exam_tips || [];

  return (
    <div>
      <TopBar title={unit.title}>
        <div className="flex items-center gap-2">
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
              label: unit.subject?.name || "Subject",
              href: `/dashboard/subjects/${subjectId}`,
            },
            { label: unit.title },
          ]}
        />

        {unit.description && (
          <p className="text-sm text-gray-600">{unit.description}</p>
        )}

        {/* Content tabs */}
        <Tabs defaultValue="long-notes" className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="long-notes" className="gap-2">
                <FileText className="h-4 w-4" />
                Long Notes ({longNotes.length})
              </TabsTrigger>
              <TabsTrigger value="short-notes" className="gap-2">
                <BookOpen className="h-4 w-4" />
                Short Notes ({shortNotes.length})
              </TabsTrigger>
              <TabsTrigger value="flashcards" className="gap-2">
                <Brain className="h-4 w-4" />
                Flashcards ({flashcards.length})
              </TabsTrigger>
              <TabsTrigger value="quizzes" className="gap-2">
                <HelpCircle className="h-4 w-4" />
                Quizzes ({quizzes.length})
              </TabsTrigger>
              <TabsTrigger value="paper-predictor" className="gap-2">
                <HelpCircle className="h-4 w-4" />
                Paper Predictor ({paperPredictors.length})
              </TabsTrigger>
              <TabsTrigger value="exam-tips" className="gap-2">
                <HelpCircle className="h-4 w-4" />
                Exam Tips ({examTips.length})
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Long Notes tab */}
          <TabsContent value="long-notes" className="space-y-4">
            <div className="flex justify-end">
              <Link
                href={`/dashboard/subjects/${subjectId}/units/${unitId}/content/notes/new`}
              >
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Long Notes
                </Button>
              </Link>
            </div>
            {longNotes.length > 0 ? (
              <div className="space-y-3">
                {longNotes.map((item) => (
                  <ContentCard
                    key={item.id}
                    title={item.title}
                    type="Long Notes"
                    createdAt={item.createdAt}
                    onClick={() =>
                      router.push(
                        `/dashboard/subjects/${subjectId}/units/${unitId}/content/${item.id}`
                      )
                    }
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No long notes yet"
                description="Create detailed long notes for this unit."
                variant="content"
              />
            )}
          </TabsContent>

          {/* Short Notes tab */}
          <TabsContent value="short-notes" className="space-y-4">
            <div className="flex justify-end">
              <Link
                href={`/dashboard/subjects/${subjectId}/units/${unitId}/content/short-notes/new`}
              >
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Short Notes
                </Button>
              </Link>
            </div>
            {shortNotes.length > 0 ? (
              <div className="space-y-3">
                {shortNotes.map((item) => (
                  <ContentCard
                    key={item.id}
                    title={item.title}
                    type="Short Notes"
                    createdAt={item.createdAt}
                    onClick={() =>
                      router.push(
                        `/dashboard/subjects/${subjectId}/units/${unitId}/content/${item.id}`
                      )
                    }
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No short notes yet"
                description="Create concise short notes for this unit."
                variant="content"
              />
            )}
          </TabsContent>

          {/* Flashcards tab */}
          <TabsContent value="flashcards" className="space-y-4">
            <div className="flex justify-end">
              <Link
                href={`/dashboard/subjects/${subjectId}/units/${unitId}/content/flashcards/new`}
              >
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Flashcards
                </Button>
              </Link>
            </div>
            {flashcards.length > 0 ? (
              <div className="space-y-3">
                {flashcards.map((item) => (
                  <ContentCard
                    key={item.id}
                    title={item.title}
                    type="Flashcards"
                    createdAt={item.createdAt}
                    onClick={() =>
                      router.push(
                        `/dashboard/subjects/${subjectId}/units/${unitId}/content/${item.id}`
                      )
                    }
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No flashcards yet"
                description="Create flashcards for this unit."
                variant="content"
              />
            )}
          </TabsContent>

          {/* Quizzes tab */}
          <TabsContent value="quizzes" className="space-y-4">
            <div className="flex justify-end">
              <Link
                href={`/dashboard/subjects/${subjectId}/units/${unitId}/content/quiz/new`}
              >
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Quiz
                </Button>
              </Link>
            </div>
            {quizzes.length > 0 ? (
              <div className="space-y-3">
                {quizzes.map((item) => (
                  <ContentCard
                    key={item.id}
                    title={item.title}
                    type="Quiz"
                    createdAt={item.createdAt}
                    onClick={() =>
                      router.push(
                        `/dashboard/subjects/${subjectId}/units/${unitId}/content/${item.id}`
                      )
                    }
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No quizzes yet"
                description="Create a quiz for this unit."
                variant="content"
              />
            )}
          </TabsContent>

          {/* Paper Predictor tab */}
          <TabsContent value="paper-predictor" className="space-y-4">
            <div className="flex justify-end">
              <Link
                href={`/dashboard/subjects/${subjectId}/units/${unitId}/content/paper-predictor/new`}
              >
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Paper Predictor
                </Button>
              </Link>
            </div>
            {paperPredictors.length > 0 ? (
              <div className="space-y-3">
                {paperPredictors.map((item) => (
                  <ContentCard
                    key={item.id}
                    title={item.title}
                    type="Paper Predictor"
                    createdAt={item.createdAt}
                    onClick={() =>
                      router.push(
                        `/dashboard/subjects/${subjectId}/units/${unitId}/content/${item.id}`
                      )
                    }
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No paper predictors yet"
                description="Add predicted papers or structured JSON that generates tests."
                variant="content"
              />
            )}
          </TabsContent>

          {/* Exam Tips tab */}
          <TabsContent value="exam-tips" className="space-y-4">
            <div className="flex justify-end">
              <Link
                href={`/dashboard/subjects/${subjectId}/units/${unitId}/content/exam-tips/new`}
              >
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Exam Tips
                </Button>
              </Link>
            </div>
            {examTips.length > 0 ? (
              <div className="space-y-3">
                {examTips.map((item) => (
                  <ContentCard
                    key={item.id}
                    title={item.title}
                    type="Exam Tips"
                    createdAt={item.createdAt}
                    onClick={() =>
                      router.push(
                        `/dashboard/subjects/${subjectId}/units/${unitId}/content/${item.id}`
                      )
                    }
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No exam tips yet"
                description="Add quick exam tips for students."
                variant="content"
              />
            )}
          </TabsContent>
        </Tabs>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Unit"
        description="This will permanently delete this unit and all its content. This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}

function ContentCard({
  title,
  type,
  createdAt,
  onClick,
}: {
  title: string | null;
  type: string;
  createdAt?: string;
  onClick: () => void;
}) {
  return (
    <Card
      className="group cursor-pointer transition-all hover:border-brand-200 hover:shadow-md"
      onClick={onClick}
    >
      <CardContent className="flex items-center justify-between py-4">
        <div>
          <p className="font-medium text-gray-900 group-hover:text-brand-700 transition-colors">
            {title || "Untitled"}
          </p>
          {createdAt && (
            <p className="mt-0.5 text-xs text-gray-500">
              Created {new Date(createdAt).toLocaleDateString()}
            </p>
          )}
        </div>
        <Badge variant="outline">{type}</Badge>
      </CardContent>
    </Card>
  );
}
