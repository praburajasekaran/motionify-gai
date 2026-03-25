-- Migration: Add name column to projects table
-- Allows super_admin and support users to rename projects.
-- When set, `name` is used as the display title; otherwise falls back to `project_number`.

ALTER TABLE projects ADD COLUMN IF NOT EXISTS name VARCHAR(255);
