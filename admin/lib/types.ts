export interface Content {
  id: string;
  type?:
    | "long_notes"
    | "short_notes"
    | "flashcard"
    | "quiz"
    | "paper_predictor"
    | "exam_tips"
    | "pyqs"
    | "syllabus"
    | "assignments";
  title: string | null;
  data: Record<string, unknown>;
  orderIndex?: number;
  isPublished?: boolean;
  createdAt?: string;
  unit?: {
    id: string;
    title: string;
    unitNumber?: number;
    subject?: { id: string; name: string; code: string } | null;
  } | null;
  unit_id?: string;
  is_published?: boolean;
}