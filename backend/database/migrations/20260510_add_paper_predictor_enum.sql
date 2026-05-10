-- Ensure paper_predictor exists in content_type enum for older databases.
-- Idempotent: safe to run multiple times.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'content_type' AND e.enumlabel = 'paper_predictor'
  ) THEN
    ALTER TYPE content_type ADD VALUE 'paper_predictor';
  END IF;
END $$;
