"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useState } from "react";
import HtmlContent from "@/components/content/HtmlContent";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Undo,
  Redo,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NotesEditorProps {
  subjectId?: string;
  unitId?: string;
  noteType?: "long_notes" | "short_notes";
  initialData?: {
    id?: string;
    title: string;
    content: string;
  };
  onSuccess?: () => void;
}

export function NotesEditor({
  subjectId,
  unitId,
  noteType = "long_notes",
  initialData,
  onSuccess,
}: NotesEditorProps) {
  const isEditing = !!initialData?.id;
  const [title, setTitle] = useState(initialData?.title || "");
  const [loading, setLoading] = useState(false);
  const [formattingPdf, setFormattingPdf] = useState(false);
  const [preview, setPreview] = useState(false);
  const [rawHtmlContent, setRawHtmlContent] = useState<string | null>(null);

  function looksLikeHtmlDocument(value: string) {
    const trimmed = value.trim();
    return (
      /<!doctype html/i.test(trimmed) ||
      /<html[\s>]/i.test(trimmed) ||
      /<body[\s>]/i.test(trimmed)
    );
  }

  function normalizeHtmlDocument(html: string) {
    if (typeof window === "undefined") {
      return { bodyHtml: html, isDocument: false };
    }

    const isDocument = /<html[\s>]/i.test(html) || /<body[\s>]/i.test(html);
    if (!isDocument) {
      return { bodyHtml: html, isDocument: false };
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    return {
      bodyHtml: doc.body?.innerHTML || html,
      isDocument: true,
    };
  }

  function getRenderableHtml() {
    if (rawHtmlContent) return rawHtmlContent;

    const editorText = editor?.getText({ blockSeparator: "\n" }) || "";
    if (looksLikeHtmlDocument(editorText)) {
      return editorText;
    }

    return null;
  }

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "Start writing your notes...",
      }),
    ],
    content: initialData?.content || "",
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-[300px] px-4 py-3",
      },
    },
  });

  useEffect(() => {
    setTitle(initialData?.title || "");
  }, [initialData?.id, initialData?.title]);

  useEffect(() => {
    if (!editor) return;
    editor.commands.setContent(initialData?.content || "", false);
    setRawHtmlContent(null);
    setPreview(false);
  }, [editor, initialData?.id, initialData?.content]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    const renderableHtml = getRenderableHtml();
    if (!editor?.getHTML() || (editor.isEmpty && !renderableHtml)) {
      toast.error("Content is required");
      return;
    }

    setLoading(true);
    try {
      const htmlToSave = getRenderableHtml() || editor.getHTML();
      const payload = {
        subjectId,
        unitId,
        type: noteType,
        title: title.trim(),
        data: { html: htmlToSave },
        isPublished: true,
      };

      if (!payload.subjectId && !payload.unitId) {
        toast.error("A subject is required to save notes");
        setLoading(false);
        return;
      }

      const endpoint = isEditing
        ? `/admin/content/${initialData!.id}`
        : "/admin/content";
      const method = isEditing ? api.put : api.post;

      const res = await method(endpoint, payload);

      if (!res.success) {
        toast.error(res.error?.message || "Failed to save notes");
        return;
      }

      toast.success(`Notes ${isEditing ? "updated" : "created"} successfully`);
      onSuccess?.();
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handlePdfUpload = async (file: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please upload a PDF file");
      return;
    }

    setFormattingPdf(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title || "Formatted Notes");

      const res = await api.post("/admin/content/format-pdf", formData);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload = res as any;
      const html = payload?.data?.html || payload?.data?.data?.html;
      if (!html) {
        toast.error("Could not extract content from PDF");
        return;
      }

      const normalized = normalizeHtmlDocument(html);
      if (normalized.isDocument) {
        setRawHtmlContent(html);
        setPreview(true);
      } else {
        setRawHtmlContent(null);
        editor?.commands.setContent(normalized.bodyHtml);
      }
      toast.success(
        "PDF formatted successfully. You can now review and publish."
      );
    } catch {
      toast.error("Failed to format PDF");
    } finally {
      setFormattingPdf(false);
    }
  };

  if (!editor) return null;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="notes-title">Title *</Label>
        <Input
          id="notes-title"
          placeholder="e.g. Introduction to Arrays"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Content *</Label>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-gray-500">
            Tip: Upload a PDF and we will auto-format it into clean notes.
          </p>
          <label className="inline-flex items-center gap-2 text-xs font-medium cursor-pointer px-2 py-1 rounded border border-gray-200 hover:bg-gray-50">
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handlePdfUpload(file);
                e.currentTarget.value = "";
              }}
            />
            {formattingPdf ? "Formatting PDF..." : "Upload PDF"}
          </label>
        </div>
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          {rawHtmlContent ? (
            <div className="border-b border-gray-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">
              Imported HTML document mode. This content will be saved and
              rendered as HTML.
            </div>
          ) : null}

          {/* Toolbar */}
          {!rawHtmlContent && (
            <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-200 bg-gray-50 p-1.5">
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleBold().run()}
                active={editor.isActive("bold")}
                title="Bold"
              >
                <Bold className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleItalic().run()}
                active={editor.isActive("italic")}
                title="Italic"
              >
                <Italic className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarDivider />
              <ToolbarButton
                onClick={() =>
                  editor.chain().focus().toggleHeading({ level: 1 }).run()
                }
                active={editor.isActive("heading", { level: 1 })}
                title="Heading 1"
              >
                <Heading1 className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton
                onClick={() =>
                  editor.chain().focus().toggleHeading({ level: 2 }).run()
                }
                active={editor.isActive("heading", { level: 2 })}
                title="Heading 2"
              >
                <Heading2 className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton
                onClick={() =>
                  editor.chain().focus().toggleHeading({ level: 3 }).run()
                }
                active={editor.isActive("heading", { level: 3 })}
                title="Heading 3"
              >
                <Heading3 className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarDivider />
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                active={editor.isActive("bulletList")}
                title="Bullet List"
              >
                <List className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                active={editor.isActive("orderedList")}
                title="Ordered List"
              >
                <ListOrdered className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarDivider />
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                active={editor.isActive("blockquote")}
                title="Quote"
              >
                <Quote className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                active={editor.isActive("codeBlock")}
                title="Code Block"
              >
                <Code className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().setHorizontalRule().run()}
                title="Horizontal Rule"
              >
                <Minus className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarDivider />
              <ToolbarButton
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().undo()}
                title="Undo"
              >
                <Undo className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().redo()}
                title="Redo"
              >
                <Redo className="h-4 w-4" />
              </ToolbarButton>
            </div>
          )}

          {/* Editor or rendered imported HTML */}
          {rawHtmlContent ? (
            <HtmlContent html={rawHtmlContent} className="bg-white p-4" />
          ) : (
            <EditorContent editor={editor} />
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={() => setPreview((s) => !s)}
          disabled={!editor || editor.isEmpty}
        >
          {preview ? "Hide Preview" : "Preview"}
        </Button>

        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? "Saving..." : isEditing ? "Update Notes" : "Create Notes"}
        </Button>
      </div>

      {/* Preview area */}
      {preview && (
        <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-white">
          <h3 className="text-sm font-semibold mb-3">Preview</h3>
          <HtmlContent html={getRenderableHtml() || editor.getHTML()} />
        </div>
      )}
    </div>
  );
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "rounded p-1.5 text-gray-600 transition-colors hover:bg-gray-200 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed",
        active && "bg-brand-100 text-brand-700 hover:bg-brand-200"
      )}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="mx-1 h-5 w-px bg-gray-300" />;
}
