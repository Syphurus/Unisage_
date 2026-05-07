"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { subjectSchema, type SubjectFormData } from "@/lib/validations";
import { api } from "@/lib/api";

const semestersByYear = {
  1: [1, 2],
  2: [3, 4],
  3: [5, 6],
  4: [7, 8],
} as const;

interface SubjectFormProps {
  initialData?: {
    id?: string;
    name: string;
    code: string;
    description?: string | null;
    year: number;
    semester: number;
    credits?: number | null;
  };
  onSuccess?: () => void;
}

export function SubjectForm({ initialData, onSuccess }: SubjectFormProps) {
  const isEditing = !!initialData?.id;
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SubjectFormData>({
    resolver: zodResolver(subjectSchema),
    defaultValues: {
      name: initialData?.name || "",
      code: initialData?.code || "",
      description: initialData?.description || "",
      year: initialData?.year || 1,
      semester: initialData?.semester || 1,
      credits: initialData?.credits ?? 4,
    },
  });

  const yearValue = watch("year");
  const semesterValue = watch("semester");
  const semesterOptions = semestersByYear[
    yearValue as keyof typeof semestersByYear
  ] || [1, 2];

  useEffect(() => {
    if (!semesterOptions.includes(semesterValue as never)) {
      setValue("semester", semesterOptions[0]);
    }
  }, [semesterOptions, semesterValue, setValue]);

  const onSubmit = async (data: SubjectFormData) => {
    setLoading(true);
    try {
      const payload = { ...data };
      const endpoint = isEditing
        ? `/admin/subjects/${initialData!.id}`
        : "/admin/subjects";
      const method = isEditing ? api.put : api.post;

      const res = await method(endpoint, payload);

      if (!res.success) {
        toast.error(
          res.error?.message ||
            `Failed to ${isEditing ? "update" : "create"} subject`
        );
        return;
      }

      toast.success(
        `Subject ${isEditing ? "updated" : "created"} successfully`
      );
      onSuccess?.();
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        {/* Name */}
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="name">Subject Name *</Label>
          <Input
            id="name"
            placeholder="e.g. Data Structures and Algorithms"
            {...register("name")}
          />
          {errors.name && (
            <p className="text-xs text-red-500">{errors.name.message}</p>
          )}
        </div>

        {/* Code */}
        <div className="space-y-2">
          <Label htmlFor="code">Subject Code *</Label>
          <Input id="code" placeholder="e.g. CSPC-301" {...register("code")} />
          {errors.code && (
            <p className="text-xs text-red-500">{errors.code.message}</p>
          )}
        </div>

        {/* Credits */}
        <div className="space-y-2">
          <Label htmlFor="credits">Credits</Label>
          <Input
            id="credits"
            type="number"
            min={1}
            max={10}
            {...register("credits", { valueAsNumber: true })}
          />
          {errors.credits && (
            <p className="text-xs text-red-500">{errors.credits.message}</p>
          )}
        </div>

        {/* Year */}
        <div className="space-y-2">
          <Label>Year *</Label>
          <Select
            value={String(yearValue)}
            onValueChange={(v) => setValue("year", Number(v))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1st Year</SelectItem>
              <SelectItem value="2">2nd Year</SelectItem>
              <SelectItem value="3">3rd Year</SelectItem>
              <SelectItem value="4">4th Year</SelectItem>
            </SelectContent>
          </Select>
          {errors.year && (
            <p className="text-xs text-red-500">{errors.year.message}</p>
          )}
        </div>

        {/* Semester */}
        <div className="space-y-2">
          <Label>Semester *</Label>
          <Select
            value={String(semesterValue)}
            onValueChange={(v) => setValue("semester", Number(v))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select semester" />
            </SelectTrigger>
            <SelectContent>
              {semesterOptions.map((semester) => (
                <SelectItem key={semester} value={String(semester)}>
                  Semester {semester}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.semester && (
            <p className="text-xs text-red-500">{errors.semester.message}</p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            rows={3}
            placeholder="Brief description of the subject..."
            {...register("description")}
          />
          {errors.description && (
            <p className="text-xs text-red-500">{errors.description.message}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={loading}>
          {loading
            ? isEditing
              ? "Saving..."
              : "Creating..."
            : isEditing
              ? "Save Changes"
              : "Create Subject"}
        </Button>
      </div>
    </form>
  );
}
