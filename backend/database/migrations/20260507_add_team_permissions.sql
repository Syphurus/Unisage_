-- Add per-admin permissions for team management
-- Run this after the base schema migration.

ALTER TABLE users
ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE users
SET permissions = COALESCE(permissions, '[]'::jsonb)
WHERE permissions IS NULL;

UPDATE users
SET permissions = '["*"]'::jsonb
WHERE role = 'admin'
  AND (permissions = '[]'::jsonb OR permissions IS NULL);
