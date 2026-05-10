-- Migration: Add missing content types (syllabus, assignments) to content_type enum
-- This migration adds the missing enum values that are used by the backend
-- but were not included in the original schema.

-- Add 'syllabus' to the content_type enum
ALTER TYPE content_type ADD VALUE 'syllabus';

-- Add 'assignments' to the content_type enum
ALTER TYPE content_type ADD VALUE 'assignments';
