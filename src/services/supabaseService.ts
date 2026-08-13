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
  source_sha256?: string | null;
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
  // Build 5 Observability & Accounting Patch Columns
  text_process_run_count?: number;
  last_text_process_at?: string | null;
  last_input_tokens?: number | null;
  last_output_tokens?: number | null;
  last_total_tokens?: number | null;
  last_latency_ms?: number | null;
  cumulative_input_tokens?: number;
  cumulative_output_tokens?: number;
  cumulative_total_tokens?: number;
  estimated_cost?: number | null;
  // Build 6 Stage 4 Observability & Accounting Patch Columns
  script_process_run_count?: number;
  last_script_process_at?: string | null;
  last_script_input_tokens?: number | null;
  last_script_output_tokens?: number | null;
  last_script_total_tokens?: number | null;
  last_script_latency_ms?: number | null;
  cumulative_script_input_tokens?: number;
  cumulative_script_output_tokens?: number;
  cumulative_script_total_tokens?: number;
  script_estimated_cost?: number | null;
  language?: string;
  // Build 7 Stage 5 Voice Foundation Columns
  female_voice_status?: string | null;
  male_voice_status?: string | null;
  female_audio_url_or_ref?: string | null;
  male_audio_url_or_ref?: string | null;
  female_duration_ms?: number | null;
  male_duration_ms?: number | null;
  voice_source_type?: string | null;
  voice_source_text_snapshot?: string | null;
  voice_provider?: string | null;
  voice_engine?: string | null;
  voice_process_run_count?: number;
  last_voice_process_at?: string | null;
  last_voice_latency_ms?: number | null;
  cumulative_voice_characters?: number;
  voice_estimated_cost?: number | null;
  // Build 8 Stage 6 Video Foundation Columns
  stage6_visual_ref?: string | null;
  video_narration_slot?: "FEMALE" | "MALE" | null;
  video_status?: string | null;
  video_url_or_ref?: string | null;
  video_provider?: string | null;
  video_engine?: string | null;
  video_provider_task_id?: string | null;
  video_process_run_count?: number;
  video_last_processed_at?: string | null;
  video_last_latency_ms?: number | null;
  video_provider_mime_type?: string | null;
  video_provider_filename?: string | null;
  video_file_size_bytes?: number | null;
  video_duration_ms?: number | null;
  video_width?: number | null;
  video_height?: number | null;
  video_frame_rate?: number | null;
  video_has_audio?: boolean | null;
  video_failure_code?: string | null;
  video_failure_message?: string | null;
  video_estimated_cost?: number | null;
}

export function mapRowToJob(row: QuoteJobRow): QuoteJob {
  return {
    contentId: row.content_id,
    status: row.workflow_status as JobStatus,
    sourceFilename: row.source_filename,
    sourceType: row.source_type as "image" | "video",
    sourceUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=1080",
    sourceSha256: row.source_sha256 || null,
    stage6VisualRef: row.stage6_visual_ref || null,
    rawOcr: row.raw_ocr_text,
    cleanText: row.clean_text,
    coreMeaning: row.core_meaning,
    scripts: {
      scriptA: row.script_a,
      scriptB: row.script_b,
      scriptC: row.script_c,
    },
    femaleVoice: {
      voiceId: row.female_voice_id || "V1-F-Sienna",
      name: "Sienna (Warm, Professional)",
      status: (row.female_voice_status as any) || "PENDING",
      audioUrl: row.female_audio_url_or_ref || undefined,
      duration: row.female_duration_ms ? `${Math.floor(row.female_duration_ms / 1000)}s` : undefined,
      audioUrlOrRef: row.female_audio_url_or_ref || null,
      durationMs: row.female_duration_ms || null
    },
    maleVoice: {
      voiceId: row.male_voice_id || "V1-M-Marcus",
      name: "Marcus (Deep, Cinematic)",
      status: (row.male_voice_status as any) || "PENDING",
      audioUrl: row.male_audio_url_or_ref || undefined,
      duration: row.male_duration_ms ? `${Math.floor(row.male_duration_ms / 1000)}s` : undefined,
      audioUrlOrRef: row.male_audio_url_or_ref || null,
      durationMs: row.male_duration_ms || null
    },
    videoStatus: (row.video_status as QuoteJob["videoStatus"]) || "PENDING",
    videoNarrationSlot: row.video_narration_slot || "FEMALE",
    videoUrlOrRef: row.video_url_or_ref || null,
    videoProvider: row.video_provider || null,
    videoEngine: row.video_engine || null,
    videoProviderTaskId: row.video_provider_task_id || null,
    videoProcessRunCount: row.video_process_run_count ?? 0,
    videoLastProcessedAt: row.video_last_processed_at || null,
    videoLastLatencyMs: row.video_last_latency_ms || null,
    videoProviderMimeType: row.video_provider_mime_type || null,
    videoProviderFilename: row.video_provider_filename || null,
    videoFileSizeBytes: row.video_file_size_bytes || null,
    videoDurationMs: row.video_duration_ms || null,
    videoWidth: row.video_width || null,
    videoHeight: row.video_height || null,
    videoFrameRate: row.video_frame_rate || null,
    videoHasAudio: row.video_has_audio ?? null,
    videoFailureCode: row.video_failure_code || null,
    videoFailureMessage: row.video_failure_message || null,
    videoEstimatedCost: row.video_estimated_cost || null,
    failedStage: row.failed_stage || undefined,
    errorMessage: row.error_message || undefined,
    // Build 5 Observability & Accounting Patch Mappings
    textProcessRunCount: row.text_process_run_count ?? 0,
    lastTextProcessAt: row.last_text_process_at || null,
    lastInputTokens: row.last_input_tokens || null,
    lastOutputTokens: row.last_output_tokens || null,
    lastTotalTokens: row.last_total_tokens || null,
    lastLatencyMs: row.last_latency_ms || null,
    cumulativeInputTokens: row.cumulative_input_tokens ?? 0,
    cumulativeOutputTokens: row.cumulative_output_tokens ?? 0,
    cumulativeTotalTokens: row.cumulative_total_tokens ?? 0,
    estimatedCost: row.estimated_cost || null,
    // Build 6 Stage 4 Observability & Accounting Patch Mappings
    scriptProcessRunCount: row.script_process_run_count ?? 0,
    lastScriptProcessAt: row.last_script_process_at || null,
    lastScriptInputTokens: row.last_script_input_tokens || null,
    lastScriptOutputTokens: row.last_script_output_tokens || null,
    lastScriptTotalTokens: row.last_script_total_tokens || null,
    lastScriptLatencyMs: row.last_script_latency_ms || null,
    cumulativeScriptInputTokens: row.cumulative_script_input_tokens ?? 0,
    cumulativeScriptOutputTokens: row.cumulative_script_output_tokens ?? 0,
    cumulativeScriptTotalTokens: row.cumulative_script_total_tokens ?? 0,
    scriptEstimatedCost: row.script_estimated_cost || null,
    language: row.language || "en",
    // Build 7 Stage 5 Observability & Account Mapping
    voiceSourceType: (row.voice_source_type as any) || "SCRIPT_A",
    voiceSourceTextSnapshot: row.voice_source_text_snapshot || null,
    voiceProvider: row.voice_provider || null,
    voiceEngine: row.voice_engine || null,
    voiceProcessRunCount: row.voice_process_run_count ?? 0,
    lastVoiceProcessAt: row.last_voice_process_at || null,
    lastVoiceLatencyMs: row.last_voice_latency_ms || null,
    cumulativeVoiceCharacters: row.cumulative_voice_characters ?? 0,
    voiceEstimatedCost: row.voice_estimated_cost || null,
  };
}

export function mapJobToRow(job: QuoteJob): QuoteJobRow {
  return {
    content_id: job.contentId,
    source_filename: job.sourceFilename,
    source_type: job.sourceType,
    source_sha256: job.sourceSha256 || null,
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
    // Build 5 Observability & Accounting Patch Mappings
    text_process_run_count: job.textProcessRunCount,
    last_text_process_at: job.lastTextProcessAt || null,
    last_input_tokens: job.lastInputTokens || null,
    last_output_tokens: job.lastOutputTokens || null,
    last_total_tokens: job.lastTotalTokens || null,
    last_latency_ms: job.lastLatencyMs || null,
    cumulative_input_tokens: job.cumulativeInputTokens,
    cumulative_output_tokens: job.cumulativeOutputTokens,
    cumulative_total_tokens: job.cumulativeTotalTokens,
    estimated_cost: job.estimatedCost || null,
    // Build 6 Stage 4 Observability & Accounting Patch Mappings
    script_process_run_count: job.scriptProcessRunCount,
    last_script_process_at: job.lastScriptProcessAt || null,
    last_script_input_tokens: job.lastScriptInputTokens || null,
    last_script_output_tokens: job.lastScriptOutputTokens || null,
    last_script_total_tokens: job.lastScriptTotalTokens || null,
    last_script_latency_ms: job.lastScriptLatencyMs || null,
    cumulative_script_input_tokens: job.cumulativeScriptInputTokens,
    cumulative_script_output_tokens: job.cumulativeScriptOutputTokens,
    cumulative_script_total_tokens: job.cumulativeScriptTotalTokens,
    script_estimated_cost: job.scriptEstimatedCost || null,
    language: job.language || "en",
    // Build 7 Stage 5 Voice Foundation Mappings
    female_voice_status: job.femaleVoice.status,
    male_voice_status: job.maleVoice.status,
    female_audio_url_or_ref: job.femaleVoice.audioUrlOrRef || null,
    male_audio_url_or_ref: job.maleVoice.audioUrlOrRef || null,
    female_duration_ms: job.femaleVoice.durationMs || null,
    male_duration_ms: job.maleVoice.durationMs || null,
    voice_source_type: job.voiceSourceType || null,
    voice_source_text_snapshot: job.voiceSourceTextSnapshot || null,
    voice_provider: job.voiceProvider || null,
    voice_engine: job.voiceEngine || null,
    voice_process_run_count: job.voiceProcessRunCount || 0,
    last_voice_process_at: job.lastVoiceProcessAt || null,
    last_voice_latency_ms: job.lastVoiceLatencyMs || null,
    cumulative_voice_characters: job.cumulativeVoiceCharacters || 0,
    voice_estimated_cost: job.voiceEstimatedCost || null,
    // Build 8 Stage 6 Video Foundation Mappings
    stage6_visual_ref: job.stage6VisualRef || null,
    video_narration_slot: job.videoNarrationSlot || "FEMALE",
    video_status: job.videoStatus,
    video_url_or_ref: job.videoUrlOrRef || null,
    video_provider: job.videoProvider || null,
    video_engine: job.videoEngine || null,
    video_provider_task_id: job.videoProviderTaskId || null,
    video_process_run_count: job.videoProcessRunCount || 0,
    video_last_processed_at: job.videoLastProcessedAt || null,
    video_last_latency_ms: job.videoLastLatencyMs || null,
    video_provider_mime_type: job.videoProviderMimeType || null,
    video_provider_filename: job.videoProviderFilename || null,
    video_file_size_bytes: job.videoFileSizeBytes || null,
    video_duration_ms: job.videoDurationMs || null,
    video_width: job.videoWidth || null,
    video_height: job.videoHeight || null,
    video_frame_rate: job.videoFrameRate || null,
    video_has_audio: job.videoHasAudio ?? null,
    video_failure_code: job.videoFailureCode || null,
    video_failure_message: job.videoFailureMessage || null,
    video_estimated_cost: null,
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
