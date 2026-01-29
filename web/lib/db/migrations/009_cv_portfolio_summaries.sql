-- Migration: Add summary columns to CV and Portfolio tables
-- Date: 2026-01-28
-- Description: Adds AI-generated summary fields for Kronus indexing

-- ============================================================================
-- SKILLS
-- ============================================================================
ALTER TABLE skills ADD COLUMN summary TEXT;

-- ============================================================================
-- WORK EXPERIENCE
-- ============================================================================
ALTER TABLE work_experience ADD COLUMN summary TEXT;

-- ============================================================================
-- EDUCATION
-- ============================================================================
ALTER TABLE education ADD COLUMN summary TEXT;

-- ============================================================================
-- PORTFOLIO PROJECTS
-- ============================================================================
ALTER TABLE portfolio_projects ADD COLUMN summary TEXT;
