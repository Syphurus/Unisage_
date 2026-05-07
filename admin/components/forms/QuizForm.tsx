"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

interface QuizOption {
  text: string;
  isCorrect: boolean;
}

interface QuizQuestion {
  question: string;
  options: QuizOption[];
  explanation?: string;
}

interface QuizFormProps {
  unitId: string;
  initialData?: {
    id?: string;
    title: string;
    questions: QuizQuestion[];
  };
  onSuccess?: () => void;
}

const defaultOption = (): QuizOption => ({ text: "", isCorrect: false });
const defaultQuestion = (): QuizQuestion => ({
  question: "",
  options: [
    { text: "", isCorrect: true },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
  ],
  explanation: "",
});

export function QuizForm({ unitId, initialData, onSuccess }: QuizFormProps) {
  const isEditing = !!initialData?.id;
  const [title, setTitle] = useState(initialData?.title || "");
  const [questions, setQuestions] = useState<QuizQuestion[]>(
    initialData?.questions || [defaultQuestion()]
  );
  const [jsonMode, setJsonMode] = useState(false);
  const [jsonText, setJsonText] = useState(
    initialData?.questions
      ? JSON.stringify({ questions: initialData.questions }, null, 2)
      : ""
  );
  const [loading, setLoading] = useState(false);

  const addQuestion = () => {
    setQuestions([...questions, defaultQuestion()]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, value: string) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], question: value };
    setQuestions(updated);
  };

  const updateExplanation = (index: number, value: string) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], explanation: value };
    setQuestions(updated);
  };

  const updateOptionText = (qIdx: number, oIdx: number, value: string) => {
    const updated = [...questions];
    updated[qIdx].options[oIdx] = {
      ...updated[qIdx].options[oIdx],
      text: value,
    };
    setQuestions(updated);
  };

  const setCorrectOption = (qIdx: number, oIdx: number) => {
    const updated = [...questions];
    updated[qIdx].options = updated[qIdx].options.map((opt, i) => ({
      ...opt,
      isCorrect: i === oIdx,
    }));
    setQuestions(updated);
  };

  const addOption = (qIdx: number) => {
    if (questions[qIdx].options.length >= 6) return;
    const updated = [...questions];
    updated[qIdx].options.push(defaultOption());
    setQuestions(updated);
  };

  const removeOption = (qIdx: number, oIdx: number) => {
    if (questions[qIdx].options.length <= 2) return;
    const updated = [...questions];
    const wasCorrect = updated[qIdx].options[oIdx].isCorrect;
    updated[qIdx].options.splice(oIdx, 1);
    if (wasCorrect && updated[qIdx].options.length > 0) {
      updated[qIdx].options[0].isCorrect = true;
    }
    setQuestions(updated);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    let payloadData: any = null;

    if (jsonMode) {
      if (!jsonText.trim()) {
        toast.error("JSON data is required");
        return;
      }
      try {
        const parsed = JSON.parse(jsonText);
        if (!parsed || !Array.isArray(parsed.questions)) {
          toast.error("JSON must be an object with a `questions` array");
          return;
        }
        // basic validation
        const validQuestions = parsed.questions.filter(
          (q: any) =>
            q.question && Array.isArray(q.options) && q.options.length >= 2
        );
        if (validQuestions.length === 0) {
          toast.error(
            "At least one complete question with 2+ options is required"
          );
          return;
        }
        payloadData = { questions: validQuestions };
      } catch (e) {
        toast.error("Invalid JSON: " + (e as Error).message);
        return;
      }
    } else {
      const validQuestions = questions.filter(
        (q) =>
          q.question.trim() &&
          q.options.filter((o) => o.text.trim()).length >= 2 &&
          q.options.some((o) => o.isCorrect)
      );

      if (validQuestions.length === 0) {
        toast.error(
          "At least one complete question with 2+ options is required"
        );
        return;
      }
      payloadData = { questions: validQuestions };
    }

    setLoading(true);
    try {
      const payload = {
        unitId,
        type: "quiz" as const,
        title: title.trim(),
        data: payloadData,
        isPublished: true,
      };

      const endpoint = isEditing
        ? `/admin/content/${initialData!.id}`
        : "/admin/content";
      const method = isEditing ? api.put : api.post;

      const res = await method(endpoint, payload);

      if (!res.success) {
        toast.error(res.error?.message || "Failed to save quiz");
        return;
      }

      toast.success(`Quiz ${isEditing ? "updated" : "created"} successfully`);
      onSuccess?.();
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="quiz-title">Quiz Title *</Label>
        <Input
          id="quiz-title"
          placeholder="e.g. Arrays & Linked Lists Quiz"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">Input mode</div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500">JSON</label>
          <input
            type="checkbox"
            checked={jsonMode}
            onChange={(e) => setJsonMode(e.target.checked)}
          />
        </div>
      </div>

      {jsonMode && (
        <div className="space-y-2">
          <Label>Quiz JSON</Label>
          <Textarea
            rows={12}
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            placeholder='{"questions": [{"question":"...","options":[{"text":"A","isCorrect":true}] }] }'
          />
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Questions ({questions.length})</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addQuestion}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Question
          </Button>
        </div>

        <div className="space-y-4">
          {questions.map((q, qIdx) => (
            <Card key={qIdx}>
              <CardContent className="pt-4 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-brand-100 text-brand-700 text-xs font-bold">
                    {qIdx + 1}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-gray-400 hover:text-red-600"
                    onClick={() => removeQuestion(qIdx)}
                    disabled={questions.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Question */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500">Question *</Label>
                  <Textarea
                    rows={2}
                    placeholder="Enter the question..."
                    value={q.question}
                    onChange={(e) => updateQuestion(qIdx, e.target.value)}
                  />
                </div>

                {/* Options */}
                <div className="space-y-2">
                  <Label className="text-xs text-gray-500">
                    Options (click to mark correct)
                  </Label>
                  {q.options.map((opt, oIdx) => (
                    <div key={oIdx} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCorrectOption(qIdx, oIdx)}
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                          opt.isCorrect
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : "border-gray-300 text-transparent hover:border-gray-400"
                        )}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <Input
                        placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                        value={opt.text}
                        onChange={(e) =>
                          updateOptionText(qIdx, oIdx, e.target.value)
                        }
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-gray-400 hover:text-red-600"
                        onClick={() => removeOption(qIdx, oIdx)}
                        disabled={q.options.length <= 2}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                  {q.options.length < 6 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-gray-500"
                      onClick={() => addOption(qIdx)}
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Add Option
                    </Button>
                  )}
                </div>

                {/* Explanation */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500">
                    Explanation (optional)
                  </Label>
                  <Input
                    placeholder="Why is this the correct answer?"
                    value={q.explanation || ""}
                    onChange={(e) => updateExplanation(qIdx, e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? "Saving..." : isEditing ? "Update Quiz" : "Create Quiz"}
        </Button>
      </div>
    </div>
  );
}
