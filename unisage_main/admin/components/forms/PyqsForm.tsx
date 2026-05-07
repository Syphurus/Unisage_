/**
 * Admin PYQs Form Component
 * Handles PDF upload for Previous Year Questions
 */

"use client";

import React, { useEffect, useState } from "react";
import { Upload, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Content } from "@/lib/types";

interface PyqsFormProps {
  content?: Content;
  isLoading?: boolean;
  onSubmit: (formData: FormData) => Promise<void>;
  contentType?: string;
  onCancel?: () => void;
}

export default function PyqsForm({
  content,
  isLoading = false,
  onSubmit,
  contentType,
  onCancel,
}: PyqsFormProps) {
  const [title, setTitle] = useState(content?.title || "");
  const [year, setYear] = useState((content?.data as any)?.year || "");
  const [subject, setSubject] = useState((content?.data as any)?.subject || "");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string>("");
  const [preview, setPreview] = useState<string>("");

  useEffect(() => {
    setTitle(content?.title || "");
    setYear((content?.data as any)?.year || "");
    setSubject((content?.data as any)?.subject || "");
    setFile(null);
    setError("");
    setPreview("");
  }, [content?.id, content?.title, content?.data]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate PDF
    if (selectedFile.type !== "application/pdf") {
      setError("Please select a valid PDF file");
      return;
    }

    if (selectedFile.size > 50 * 1024 * 1024) {
      setError("File size must be less than 50 MB");
      return;
    }

    setFile(selectedFile);
    setError("");
    setPreview(selectedFile.name);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError("Please enter a title");
      return;
    }

    if (!year.trim()) {
      setError("Please enter the year");
      return;
    }

    if (!subject.trim()) {
      setError("Please enter the subject");
      return;
    }

    if (!content && !file) {
      setError("Please upload a PDF file");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("type", contentType || "pyqs");
      formData.append("title", title);
      formData.append(
        "data",
        JSON.stringify({
          year: parseInt(year),
          subject,
        })
      );

      if (file) {
        formData.append("file", file);
      }

      if (content) {
        formData.append("id", content.id);
      }

      await onSubmit(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save PYQ");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div className="space-y-2">
        <Label htmlFor="title">
          {contentType === "syllabus"
            ? "Syllabus Title"
            : contentType === "assignments"
            ? "Assignment Title"
            : "PYQ Title"}
        </Label>
        <Input
          id="title"
          placeholder="e.g., Data Structures 2023"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="year">Year</Label>
          <Input
            id="year"
            type="number"
            placeholder="2023"
            min="2000"
            max={new Date().getFullYear()}
            value={year}
            onChange={(e) => setYear(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="subject">Subject/Course</Label>
          <Input
            id="subject"
            placeholder="e.g., Data Structures"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>
      </div>

      {/* File Upload Section */}
      <div className="space-y-2">
        <Label>PDF File</Label>
        <div className="relative">
          <Input
            id="file-input"
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
          <label
            htmlFor="file-input"
            className="flex items-center justify-center w-full px-4 py-8 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
          >
            <div className="text-center">
              {preview ? (
                <>
                  <FileText className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <p className="text-sm font-medium">{preview}</p>
                  <p className="text-xs text-gray-500 mt-1">Click to change</p>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm font-medium">Click to upload PDF</p>
                  <p className="text-xs text-gray-500 mt-1">Max 50 MB</p>
                </>
              )}
            </div>
          </label>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400 flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            className="hover:opacity-70"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Submit Buttons */}
      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={isLoading}
          className="flex-1"
        >
          {isLoading ? "Saving..." : content ? "Update PYQ" : "Create PYQ"}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
