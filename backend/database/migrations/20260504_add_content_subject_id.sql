ALTER TABLE content
ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_content_subject ON content(subject_id);
