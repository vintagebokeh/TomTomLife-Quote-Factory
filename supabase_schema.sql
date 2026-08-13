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
