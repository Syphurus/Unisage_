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
      parsed = JSON.parse(jsonText);
    } catch (e) {
      toast.error("Invalid JSON: " + (e as Error).message);
      return;
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
        <Textarea
          rows={12}
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          placeholder='Paste JSON here (e.g. {"items": [{"front":"Q","back":"A"}]})'
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
