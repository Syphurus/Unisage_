
-- Add file-backed content types (pyqs, syllabus, assignments) and files table

DO $$
BEGIN
  -- Add each enum value only if it does not already exist
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'content_type' AND e.enumlabel = 'pyqs'
  ) THEN
    ALTER TYPE content_type ADD VALUE 'pyqs';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'content_type' AND e.enumlabel = 'syllabus'
  ) THEN
    ALTER TYPE content_type ADD VALUE 'syllabus';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'content_type' AND e.enumlabel = 'assignments'
  ) THEN
    ALTER TYPE content_type ADD VALUE 'assignments';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID UNIQUE REFERENCES content(id) ON DELETE CASCADE,
  original_filename TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  mime_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_files_content_id ON files(content_id);
