-- Add per-subject Paper Predictor visibility toggle.
ALTER TABLE subjects
ADD COLUMN IF NOT EXISTS predictor_visible BOOLEAN DEFAULT true;