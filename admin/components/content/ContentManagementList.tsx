/**
 * Admin Content Management List
 * Shows all content items for a subject/unit with edit/delete buttons
 */

"use client";

import React, { useState } from "react";
import { Trash2, Edit2, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/dialog";
import type { Content } from "@/lib/types";

interface ContentManagementListProps {
  contents: Content[];
  contentType: string;
  onEdit: (content: Content) => void;
  onDelete: (contentId: string) => Promise<void>;
  isLoading?: boolean;
}

export default function ContentManagementList({
  contents,
  contentType,
  onEdit,
  onDelete,
  isLoading = false,
}: ContentManagementListProps) {
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (contentId: string) => {
    setDeleting(contentId);
    try {
      await onDelete(contentId);
      setDeleteConfirm(null);
    } finally {
      setDeleting(null);
    }
  };

  const getContentPreview = (content: Content): string => {
    if (!content.data) return "No data";
    
    switch (contentType) {
      case "long_notes":
      case "short_notes":
      case "exam_tips":
        if ((content.data as any)?.html) {
          return "HTML Document";
        }
        return (content.data as any)?.content?.substring(0, 100) || "No content";
      case "flashcard":
        return `Q: ${(content.data as any)?.front || "N/A"}`;
      case "quiz":
        return `Question: ${(content.data as any)?.question?.substring(0, 50) || "N/A"}`;
      case "pyqs":
        return `Year: ${(content.data as any)?.year || "N/A"}, Subject: ${(content.data as any)?.subject || "N/A"}`;
      case "syllabus":
      case "assignments":
        return `File: ${(content.data as any)?.original_filename || (content as any)?.filename || "Document"}`;
      default:
        return JSON.stringify(content.data).substring(0, 100);
    }
  };

  if (!contents || contents.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No {contentType} content found</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {contents.map((content) => (
        <div
          key={content.id}
          className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate">
              {content.title || `Untitled ${contentType}`}
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 truncate mt-1">
              {getContentPreview(content)}
            </p>
            <div className="flex gap-2 mt-2">
              <span
                className={`text-xs px-2 py-1 rounded ${
                  content.isPublished
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                }`}
              >
                {content.isPublished ? "Published" : "Draft"}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Created:{" "}
                {new Date(content.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => onEdit(content)}
                className="flex items-center gap-2"
              >
                <Edit2 className="h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setDeleteConfirm(content.id)}
                className="flex items-center gap-2 text-red-600 dark:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ))}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogTitle>Delete Content?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this content? This action cannot be undone.
            </AlertDialogDescription>
            <div className="flex justify-end gap-3">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleting === deleteConfirm}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleting === deleteConfirm ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
