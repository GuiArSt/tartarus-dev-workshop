-- Migration: Rename repository "Jobilla" to "jobilla" (lowercase)
-- This standardizes the repository naming convention

-- Update journal_entries
UPDATE journal_entries SET repository = 'jobilla' WHERE repository = 'Jobilla';

-- Update project_summaries (if exists)
UPDATE project_summaries SET repository = 'jobilla' WHERE repository = 'Jobilla';
