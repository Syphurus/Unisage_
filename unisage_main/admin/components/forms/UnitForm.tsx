"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { unitSchema, type UnitFormData } from "@/lib/validations";
import { api } from "@/lib/api";

interface UnitFormProps {
  subjectId: string;
  initialData?: {
    id?: string;
    unitNumber?: number;
    title: string;
    description?: string;
    orderIndex?: number;
  };
  onSuccess?: () => void;
}

export function UnitForm({ subjectId, initialData, onSuccess }: UnitFormProps) {
  const isEditing = !!initialData?.id;
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UnitFormData>({
    resolver: zodResolver(unitSchema),
    defaultValues: {
      unitNumber: initialData?.unitNumber || 1,
      title: initialData?.title || "",
      description: initialData?.description || "",
      orderIndex: initialData?.orderIndex || 0,
    },
  });

  const onSubmit = async (data: UnitFormData) => {
    setLoading(true);
    try {
      const payload = { ...data, subjectId };
      const endpoint = isEditing
        ? `/admin/units/${initialData!.id}`
        : "/admin/units";
      const method = isEditing ? api.put : api.post;

      const res = await method(endpoint, payload);

      if (!res.success) {
        toast.error(
          res.error?.message ||
            `Failed to ${isEditing ? "update" : "create"} unit`
        );
        return;
      }

      toast.success(`Unit ${isEditing ? "updated" : "created"} successfully`);
      onSuccess?.();
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="unitNumber">Unit Number *</Label>
        <Input
          id="unitNumber"
          type="number"
          min={1}
          {...register("unitNumber", { valueAsNumber: true })}
        />
        {errors.unitNumber && (
          <p className="text-xs text-red-500">{errors.unitNumber.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Unit Title *</Label>
        <Input
          id="title"
          placeholder="e.g. Introduction to Arrays"
          {...register("title")}
        />
        {errors.title && (
          <p className="text-xs text-red-500">{errors.title.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="orderIndex">Display Order</Label>
        <Input
          id="orderIndex"
          type="number"
          min={0}
          {...register("orderIndex", { valueAsNumber: true })}
        />
        {errors.orderIndex && (
          <p className="text-xs text-red-500">{errors.orderIndex.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          rows={3}
          placeholder="Brief description of this unit..."
          {...register("description")}
        />
        {errors.description && (
          <p className="text-xs text-red-500">{errors.description.message}</p>
        )}
      </div>

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={loading}>
          {loading
            ? isEditing
              ? "Saving..."
              : "Creating..."
            : isEditing
              ? "Save Changes"
              : "Create Unit"}
        </Button>
      </div>
    </form>
  );
}
