import { createClient } from "@supabase/supabase-js";
import { QuoteJob, JobStatus } from "../types";
import { initialMockJob } from "../mockData";

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || "";

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export interface QuoteJobRow {
  id?: string;
  content_id: string;
  source_filename: string;
  source_type: string;
  raw_ocr_text: string;
  clean_text: string;
  core_meaning: string;
  script_a: string;
  script_b: string;
  script_c: string;
  female_voice_id: string;
  male_voice_id: string;
  workflow_status: string;
  failed_stage: string | null;
  error_message: string | null;
  created_at?: string;
  updated_at?: string;
}

export function mapRowToJob(row: QuoteJobRow): QuoteJob {
  return {
    contentId: row.content_id,
    status: row.workflow_status as JobStatus,
    sourceFilename: row.source_filename,
    sourceType: row.source_type as "image" | "video",
    sourceUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=1080",
    rawOcr: row.raw_ocr_text,
    cleanText: row.clean_text,
    coreMeaning: row.core_meaning,
    scripts: {
      scriptA: row.script_a,
      scriptB: row.script_b,
      scriptC: row.script_c,
    },
    femaleVoice: {
      voiceId: row.female_voice_id,
      name: "Sienna (Warm, Professional)",
      status: "GENERATED",
      duration: "0:15"
    },
    maleVoice: {
      voiceId: row.male_voice_id,
      name: "Marcus (Deep, Cinematic)",
      status: "GENERATED",
      duration: "0:14"
    },
    videoStatus: "READY",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-forest-stream-in-the-sunlight-529-large.mp4",
    failedStage: row.failed_stage || undefined,
    errorMessage: row.error_message || undefined,
  };
}

export function mapJobToRow(job: QuoteJob): QuoteJobRow {
  return {
    content_id: job.contentId,
    source_filename: job.sourceFilename,
    source_type: job.sourceType,
    raw_ocr_text: job.rawOcr,
    clean_text: job.cleanText,
    core_meaning: job.coreMeaning,
    script_a: job.scripts.scriptA,
    script_b: job.scripts.scriptB,
    script_c: job.scripts.scriptC,
    female_voice_id: job.femaleVoice.voiceId,
    male_voice_id: job.maleVoice.voiceId,
    workflow_status: job.status,
    failed_stage: job.failedStage || null,
    error_message: job.errorMessage || null,
  };
}

export const supabaseService = {
  isConfigured(): boolean {
    return !!supabase;
  },

  async loadJob(contentId: string): Promise<QuoteJob> {
    if (!supabase) {
      throw new Error("Supabase is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment variables.");
    }

    const { data, error } = await supabase
      .from("quote_jobs")
      .select("*")
      .eq("content_id", contentId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch job from database: ${error.message}`);
    }

    if (!data) {
      console.log("Database quote_jobs table is empty. Seeding Q000001 initial row...");
      const initialRow = mapJobToRow(initialMockJob);
      const { data: insertedData, error: insertError } = await supabase
        .from("quote_jobs")
        .insert([initialRow])
        .select();

      if (insertError) {
        throw new Error(`Failed to initialize default job row: ${insertError.message}`);
      }

      const insertedRow = insertedData && insertedData.length > 0 ? insertedData[0] : null;
      if (!insertedRow) {
        console.warn("Seeding succeeded but select() returned no row. Retrying explicit fetch...");
        const { data: retryData, error: retryError } = await supabase
          .from("quote_jobs")
          .select("*")
          .eq("content_id", contentId)
          .maybeSingle();
        if (retryError || !retryData) {
          throw new Error(`Seeding succeeded but row could not be read back: ${retryError?.message || "Not found"}`);
        }
        console.log("Successfully retrieved seeded Q000001 row via retry fetch.");
        return mapRowToJob(retryData);
      }

      console.log("Successfully seeded Q000001 into Supabase!", insertedRow);
      return mapRowToJob(insertedRow);
    }

    return mapRowToJob(data);
  },

  async saveJob(job: QuoteJob): Promise<void> {
    if (!supabase) {
      throw new Error("Supabase client is not configured. Cannot save to remote database.");
    }

    const row = mapJobToRow(job);
    // Explicitly update updated_at timestamp to confirm updated_at changes
    (row as any).updated_at = new Date().toISOString();
    
    const { error } = await supabase
      .from("quote_jobs")
      .update(row)
      .eq("content_id", job.contentId);

    if (error) {
      throw new Error(`Database save error: ${error.message}`);
    }
  }
};
