"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";

interface FlashcardItem {
  front: string;
  back: string;
}

interface FlashcardFormProps {
  unitId: string;
  initialData?: {
    id?: string;
    title: string;
    items: FlashcardItem[];
  };
  onSuccess?: () => void;
}

export function FlashcardForm({
  unitId,
  initialData,
  onSuccess,
}: FlashcardFormProps) {
  const isEditing = !!initialData?.id;
  const [title, setTitle] = useState(initialData?.title || "");
  const [items, setItems] = useState<FlashcardItem[]>(
    initialData?.items || [{ front: "", back: "" }]
  );
  const [loading, setLoading] = useState(false);
  const [jsonMode, setJsonMode] = useState(false);
  const [jsonText, setJsonText] = useState(
    initialData?.items
      ? JSON.stringify({ items: initialData.items }, null, 2)
      : ""
  );

  const addItem = () => {
    setItems([...items, { front: "", back: "" }]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (
    index: number,
    field: "front" | "back",
    value: string
  ) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
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
        if (!parsed || !Array.isArray(parsed.items)) {
          toast.error("JSON must be an object with an `items` array");
          return;
        }
        payloadData = {
          items: parsed.items.filter((i: any) => i.front && i.back),
        };
        if (payloadData.items.length === 0) {
          toast.error("At least one complete flashcard is required");
          return;
        }
      } catch (e) {
        toast.error("Invalid JSON: " + (e as Error).message);
        return;
      }
    } else {
      const validItems = items.filter((i) => i.front.trim() && i.back.trim());
      if (validItems.length === 0) {
        toast.error("At least one complete flashcard is required");
        return;
      }
      payloadData = { items: validItems };
    }

    setLoading(true);
    try {
      const payload = {
        unitId,
        type: "flashcard" as const,
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
        toast.error(res.error?.message || "Failed to save flashcards");
        return;
      }

      toast.success(
        `Flashcards ${isEditing ? "updated" : "created"} successfully`
      );
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
        <Label htmlFor="flashcard-title">Title *</Label>
        <Input
          id="flashcard-title"
          placeholder="e.g. Array Operations Flashcards"
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
          <Label>Flashcards JSON</Label>
          <Textarea
            rows={10}
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            placeholder='{"items": [{"front":"Q","back":"A"}]}'
          />
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Flashcards ({items.length})</Label>
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="mr-2 h-4 w-4" />
            Add Card
          </Button>
        </div>

        <div className="space-y-3">
          {items.map((item, index) => (
            <Card key={index} className="relative">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <div className="mt-2 text-gray-400">
                    <GripVertical className="h-5 w-5" />
                  </div>
                  <div className="flex-1 grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-500">
                        Front (Question)
                      </Label>
                      <Textarea
                        rows={2}
                        placeholder="Question or term..."
                        value={item.front}
                        onChange={(e) =>
                          updateItem(index, "front", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-500">
                        Back (Answer)
                      </Label>
                      <Textarea
                        rows={2}
                        placeholder="Answer or definition..."
                        value={item.back}
                        onChange={(e) =>
                          updateItem(index, "back", e.target.value)
                        }
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-gray-400 hover:text-red-600"
                    onClick={() => removeItem(index)}
                    disabled={items.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button onClick={handleSubmit} disabled={loading}>
          {loading
            ? "Saving..."
            : isEditing
              ? "Update Flashcards"
              : "Create Flashcards"}
        </Button>
      </div>
    </div>
  );
}
