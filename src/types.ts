/**
 * TomTomLife-Quote-Factory V1.0 - Build 1 Type Definitions
 */

export type JobStatus =
  | "NEW"
  | "EXTRACTED"
  | "OCR_READY"
  | "TEXT_READY"
  | "SCRIPT_READY"
  | "AUDIO_READY"
  | "VIDEO_READY"
  | "REVIEW"
  | "COMPLETED"
  | "FAILED";

export interface VoiceSlot {
  voiceId: string;
  name: string;
  status: "PENDING" | "PROCESSING" | "GENERATED" | "FAILED";
  audioUrl?: string;
  duration?: string;
  audioUrlOrRef?: string | null; // Build 7 Foundation
  durationMs?: number | null; // Build 7 Foundation
}

export interface ScriptVariants {
  scriptA: string;
  scriptB: string;
  scriptC: string;
}

export interface QuoteJob {
  contentId: string;
  status: JobStatus;
  sourceFilename: string;
  sourceType: "image" | "video";
  sourceUrl: string; // Placeholder or static mock image
  rawOcr: string;
  cleanText: string;
  coreMeaning: string;
  scripts: ScriptVariants;
  femaleVoice: VoiceSlot;
  maleVoice: VoiceSlot;
  videoStatus: "PENDING" | "RENDERING" | "READY" | "FAILED";
  videoUrl?: string; // final MP4 placeholder url
  failedStage?: string;
  errorMessage?: string;
  // Build 5 Observability & Accounting Patch
  textProcessRunCount: number;
  lastTextProcessAt?: string | null;
  lastInputTokens?: number | null;
  lastOutputTokens?: number | null;
  lastTotalTokens?: number | null;
  lastLatencyMs?: number | null;
  cumulativeInputTokens: number;
  cumulativeOutputTokens: number;
  cumulativeTotalTokens: number;
  estimatedCost?: number | null;
  // Build 6 Stage 4 Observability & Accounting Patch
  scriptProcessRunCount: number;
  lastScriptProcessAt?: string | null;
  lastScriptInputTokens?: number | null;
  lastScriptOutputTokens?: number | null;
  lastScriptTotalTokens?: number | null;
  lastScriptLatencyMs?: number | null;
  cumulativeScriptInputTokens: number;
  cumulativeScriptOutputTokens: number;
  cumulativeScriptTotalTokens: number;
  scriptEstimatedCost?: number | null;
  language?: string;
  // Build 7 Stage 5 Voice Foundation Properties
  voiceSourceType?: "SCRIPT_A" | "SCRIPT_B" | "SCRIPT_C" | "CLEAN_TEXT" | null;
  voiceSourceTextSnapshot?: string | null;
  voiceProvider?: string | null;
  voiceEngine?: string | null;
  voiceProcessRunCount?: number;
  lastVoiceProcessAt?: string | null;
  lastVoiceLatencyMs?: number | null;
  cumulativeVoiceCharacters?: number;
  voiceEstimatedCost?: number | null;
}

// Clean service boundaries to be connected incrementally in later builds
export interface IOcrService {
  extractText(sourceUrl: string): Promise<{ rawOcr: string; cleanText: string }>;
}

export interface IMeaningService {
  extractCoreMeaning(cleanText: string): Promise<string>;
}

export interface IScriptService {
  generateScripts(
    cleanText: string,
    coreMeaning: string,
    language: string,
    options?: {
      scriptProcessRunCount: number;
      cumulativeScriptInputTokens: number;
      cumulativeScriptOutputTokens: number;
      cumulativeScriptTotalTokens: number;
    }
  ): Promise<any>;
}

export interface IVoiceService {
  generateVoice(script: string, voiceId: string): Promise<string>; // returns audio placeholder url
}

export interface IVideoService {
  composeVideo(params: {
    sourceUrl: string;
    script: string;
    audioUrl: string;
    format: "1080x1920";
  }): Promise<string>; // returns final video mp4 url
}
