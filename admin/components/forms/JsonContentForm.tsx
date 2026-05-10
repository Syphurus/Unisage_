"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";

interface JsonContentFormProps {
  subjectId?: string;
  unitId?: string;
  type: string; // expects one of content types
  initialData?: {
    id?: string;
    title?: string;
    data?: any;
  };
  onSuccess?: () => void;
}

export function JsonContentForm({
  subjectId,
  unitId,
  type,
  initialData,
  onSuccess,
}: JsonContentFormProps) {
  const isEditing = !!initialData?.id;
  const [title, setTitle] = useState(initialData?.title || "");
  const [jsonText, setJsonText] = useState(
    initialData?.data ? JSON.stringify(initialData.data, null, 2) : ""
  );
  const [loading, setLoading] = useState(false);

  const parseJsonInput = (raw: string) => {
    const withoutFence = raw
      .trim()
      .replace(/```(?:json)?/gi, "")
      .replace(/```/g, "");

    // Common copy/paste cleanup: smart quotes and trailing commas.
    const normalized = withoutFence
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2018\u2019]/g, "'");

    try {
      return JSON.parse(normalized);
    } catch {
      const withoutTrailingCommas = normalized.replace(/,\s*([}\]])/g, "$1");
      return JSON.parse(withoutTrailingCommas);
    }
  };

  const normalizeExamTipsData = (input: unknown) => {
    if (Array.isArray(input)) {
      return {
        tips: input.map((tip) => {
          if (typeof tip === "string") {
            return { title: tip, body: "" };
          }
          return tip;
        }),
      };
    }

    if (input && typeof input === "object") {
      const data = input as Record<string, unknown>;

      if (Array.isArray(data.tips) || Array.isArray(data.exam_tips) || data.html) {
        return data;
      }

      if (Array.isArray(data.items)) {
        return { tips: data.items };
      }
    }

    return input;
  };

  const normalizePaperPredictorData = (input: unknown) => {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      return input;
    }

    const data = { ...(input as Record<string, unknown>) };

    if (typeof data.predictions === "string") {
      try {
        const parsedPredictions = parseJsonInput(String(data.predictions));
        if (Array.isArray(parsedPredictions)) {
          data.predictions = parsedPredictions;
        }
      } catch {
        // Keep original value so server-side validation can still report issues.
      }
    }

    if (Array.isArray(data.questions) && !Array.isArray(data.predictions)) {
      data.predictions = data.questions;
    }

    return data;
  };

  const jsonPlaceholder =
    type === "exam_tips"
      ? '{"tips": [{"title": "5-marker strategy", "body": "Start with definitions, then add 2 keywords."}]}'
      : type === "paper_predictor"
        ? '{"subject":"Linear Algebra","course_code":"MATH2059","predictions":[{"id":"pred_01","section":"C","priority_rank":1,"predicted_question":"...","confidence_score":99}]}'
      : 'Paste JSON here (e.g. {"items": [{"front":"Q","back":"A"}]})';

  useEffect(() => {
    setTitle(initialData?.title || "");
    setJsonText(
      initialData?.data ? JSON.stringify(initialData.data, null, 2) : ""
    );
  }, [initialData?.id, initialData?.title, initialData?.data]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!jsonText.trim()) {
      toast.error("JSON data is required");
      return;
    }

    let parsed;
    try {
      parsed = parseJsonInput(jsonText);

      if (type === "exam_tips") {
        parsed = normalizeExamTipsData(parsed);
      }

      if (type === "paper_predictor") {
        parsed = normalizePaperPredictorData(parsed);
      }
    } catch (e) {
      toast.error(
        type === "exam_tips"
          ? "Invalid JSON. Use {\"tips\": [...]} or paste a valid JSON array/object."
          : type === "paper_predictor"
            ? "Invalid Paper Predictor JSON. Remove broken tokens and ensure it is valid JSON."
          : "Invalid JSON: " + (e as Error).message
      );
      return;
    }

    if (type === "exam_tips") {
      const data = parsed as Record<string, unknown>;
      const tips = Array.isArray(data?.tips)
        ? data.tips
        : Array.isArray(data?.exam_tips)
          ? data.exam_tips
          : [];

      if (!data?.html && tips.length === 0) {
        toast.error(
          'Exam tips JSON must include "html" or a non-empty "tips" array.'
        );
        return;
      }
    }

    if (type === "paper_predictor") {
      const data = parsed as Record<string, unknown>;
      if (!data || Array.isArray(data)) {
        toast.error("Paper Predictor data must be a JSON object.");
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        subjectId,
        unitId,
        type,
        title: title.trim(),
        data: parsed,
        isPublished: true,
      };

      if (!payload.subjectId && !payload.unitId) {
        toast.error("A subject is required to save content");
        setLoading(false);
        return;
      }

      const endpoint = isEditing
        ? `/admin/content/${initialData!.id}`
        : "/admin/content";
      const method = isEditing ? api.put : api.post;

      const res = await method(endpoint, payload);

      if (!res.success) {
        toast.error(res.error?.message || "Failed to save content");
        return;
      }

      toast.success(
        `${type} ${isEditing ? "updated" : "created"} successfully`
      );
      onSuccess?.();
    } catch (err) {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Title *</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label>JSON Data *</Label>
        {type === "exam_tips" && (
          <p className="text-xs text-muted-foreground">
            Accepted shapes: <strong>{'{"tips": [...]}'}</strong>,
            <strong className="ml-1">{"[{...}, {...}]"}</strong>, or
            <strong className="ml-1">{"{\"html\": \"...\"}"}</strong>.
          </p>
        )}
        {type === "paper_predictor" && (
          <p className="text-xs text-muted-foreground">
            Paste the full predictor object with fields like <strong>subject</strong>,
            <strong className="ml-1">exam_structure_confirmed</strong>, and
            <strong className="ml-1">predictions</strong>. Code fences are allowed.
          </p>
        )}
        <Textarea
          rows={12}
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          placeholder={jsonPlaceholder}
        />
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? "Saving..." : isEditing ? "Update" : "Create"}
        </Button>
      </div>
    </div>
  );
}

export default JsonContentForm;
