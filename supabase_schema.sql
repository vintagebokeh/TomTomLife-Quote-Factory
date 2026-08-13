-- SQL DDL schema for TomTomLife-Quote-Factory V1.0 Build 2
-- Run this in your Supabase SQL Editor to provision the required table.

CREATE TABLE IF NOT EXISTS quote_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id VARCHAR(50) UNIQUE NOT NULL,
  source_filename TEXT NOT NULL,
  source_type VARCHAR(20) NOT NULL,
  raw_ocr_text TEXT NOT NULL,
  clean_text TEXT NOT NULL,
  core_meaning TEXT NOT NULL,
  script_a TEXT NOT NULL,
  script_b TEXT NOT NULL,
  script_c TEXT NOT NULL,
  female_voice_id VARCHAR(100) NOT NULL,
  male_voice_id VARCHAR(100) NOT NULL,
  workflow_status VARCHAR(50) NOT NULL,
  failed_stage VARCHAR(100),
  error_message TEXT,
  -- Build 5 Observability & Accounting Patch Columns
  text_process_run_count INT DEFAULT 0 NOT NULL,
  last_text_process_at TIMESTAMP WITH TIME ZONE,
  last_input_tokens INT,
  last_output_tokens INT,
  last_total_tokens INT,
  last_latency_ms INT,
  cumulative_input_tokens INT DEFAULT 0 NOT NULL,
  cumulative_output_tokens INT DEFAULT 0 NOT NULL,
  cumulative_total_tokens INT DEFAULT 0 NOT NULL,
  estimated_cost NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) if desired, or allow public access for development
ALTER TABLE quote_jobs ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all reads and writes during developer sandbox phase
CREATE POLICY "Allow public read and write access for development" 
ON quote_jobs FOR ALL 
USING (true) 
WITH CHECK (true);

-- Build 8A Stage 6 provider-neutral video foundation. These ALTER statements
-- also apply cleanly to databases provisioned by earlier Build 7 handoffs.
ALTER TABLE quote_jobs ADD COLUMN IF NOT EXISTS stage6_visual_ref TEXT;
ALTER TABLE quote_jobs ADD COLUMN IF NOT EXISTS source_sha256 TEXT;
ALTER TABLE quote_jobs ADD COLUMN IF NOT EXISTS video_narration_slot VARCHAR(10) NOT NULL DEFAULT 'FEMALE';
ALTER TABLE quote_jobs ADD COLUMN IF NOT EXISTS video_status VARCHAR(20) NOT NULL DEFAULT 'PENDING';
ALTER TABLE quote_jobs ADD COLUMN IF NOT EXISTS video_url_or_ref TEXT;
ALTER TABLE quote_jobs ADD COLUMN IF NOT EXISTS video_provider TEXT;
ALTER TABLE quote_jobs ADD COLUMN IF NOT EXISTS video_engine TEXT;
ALTER TABLE quote_jobs ADD COLUMN IF NOT EXISTS video_provider_task_id TEXT;
ALTER TABLE quote_jobs ADD COLUMN IF NOT EXISTS video_process_run_count INT NOT NULL DEFAULT 0;
ALTER TABLE quote_jobs ADD COLUMN IF NOT EXISTS video_last_processed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE quote_jobs ADD COLUMN IF NOT EXISTS video_last_latency_ms INT;
ALTER TABLE quote_jobs ADD COLUMN IF NOT EXISTS video_provider_mime_type TEXT;
ALTER TABLE quote_jobs ADD COLUMN IF NOT EXISTS video_provider_filename TEXT;
ALTER TABLE quote_jobs ADD COLUMN IF NOT EXISTS video_file_size_bytes BIGINT;
ALTER TABLE quote_jobs ADD COLUMN IF NOT EXISTS video_duration_ms INT;
ALTER TABLE quote_jobs ADD COLUMN IF NOT EXISTS video_width INT;
ALTER TABLE quote_jobs ADD COLUMN IF NOT EXISTS video_height INT;
ALTER TABLE quote_jobs ADD COLUMN IF NOT EXISTS video_frame_rate DOUBLE PRECISION;
ALTER TABLE quote_jobs ADD COLUMN IF NOT EXISTS video_has_audio BOOLEAN;
ALTER TABLE quote_jobs ADD COLUMN IF NOT EXISTS video_failure_code TEXT;
ALTER TABLE quote_jobs ADD COLUMN IF NOT EXISTS video_failure_message TEXT;
ALTER TABLE quote_jobs ADD COLUMN IF NOT EXISTS video_estimated_cost NUMERIC;

-- Build 8D clean-room QUOTE_CINEMATIC_V1 production recipe.
ALTER TABLE quote_jobs ADD COLUMN IF NOT EXISTS production_recipe_id TEXT;
ALTER TABLE quote_jobs ADD COLUMN IF NOT EXISTS production_recipe_version TEXT;
ALTER TABLE quote_jobs ADD COLUMN IF NOT EXISTS production_status TEXT NOT NULL DEFAULT 'NOT_STARTED';
ALTER TABLE quote_jobs ADD COLUMN IF NOT EXISTS production_input_fingerprint TEXT;
ALTER TABLE quote_jobs ADD COLUMN IF NOT EXISTS production_narration_slot VARCHAR(10) NOT NULL DEFAULT 'FEMALE';
ALTER TABLE quote_jobs ADD COLUMN IF NOT EXISTS production_visual_brief JSONB;
ALTER TABLE quote_jobs ADD COLUMN IF NOT EXISTS production_final_asset_id UUID;
ALTER TABLE quote_jobs ADD COLUMN IF NOT EXISTS production_failure_code TEXT;
ALTER TABLE quote_jobs ADD COLUMN IF NOT EXISTS production_failure_message TEXT;

CREATE TABLE IF NOT EXISTS production_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id VARCHAR(50) NOT NULL REFERENCES quote_jobs(content_id) ON DELETE CASCADE,
  recipe_id TEXT NOT NULL,
  recipe_version TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('VISUAL_BRIEF', 'KEYFRAME', 'MOTION', 'SUBTITLE', 'FINAL_MASTER')),
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'PROCESSING', 'READY', 'FAILED', 'STALE')),
  local_ref TEXT,
  mime_type TEXT,
  width INT,
  height INT,
  duration_ms INT,
  file_size_bytes BIGINT,
  sha256 TEXT,
  provider TEXT,
  engine TEXT,
  provider_task_id TEXT,
  input_snapshot JSONB,
  failure_code TEXT,
  failure_message TEXT,
  estimated_cost NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS production_assets_content_recipe_kind_idx ON production_assets(content_id, recipe_id, recipe_version, kind, updated_at DESC);
ALTER TABLE production_assets ENABLE ROW LEVEL SECURITY;
