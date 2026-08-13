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

export type ProductionStatus = "NOT_STARTED" | "PLANNING" | "GENERATING_VISUAL" | "COMPOSING" | "READY" | "FAILED";
export type ProductionAssetKind = "VISUAL_BRIEF" | "KEYFRAME" | "MOTION" | "SUBTITLE" | "FINAL_MASTER";
export type ProductionAssetStatus = "PENDING" | "PROCESSING" | "READY" | "FAILED" | "STALE";

export interface VisualBrief {
  subject: string;
  scene: string;
  mood: string;
  lighting: string;
  composition: string;
  paletteIntent: string;
  negativeConstraints: string[];
  aspectRatio: "9:16";
  textInImage: false;
}

export interface ProductionAsset {
  id?: string;
  contentId: string;
  recipeId: "QUOTE_CINEMATIC_V1";
  recipeVersion: "1.0";
  kind: ProductionAssetKind;
  status: ProductionAssetStatus;
  localRef?: string | null;
  mimeType?: string | null;
  width?: number | null;
  height?: number | null;
  durationMs?: number | null;
  fileSizeBytes?: number | null;
  sha256?: string | null;
  provider?: string | null;
  engine?: string | null;
  providerTaskId?: string | null;
  inputSnapshot?: Record<string, unknown> | null;
  failureCode?: string | null;
  failureMessage?: string | null;
  estimatedCost?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface QuoteJob {
  contentId: string;
  status: JobStatus;
  sourceFilename: string;
  sourceType: "image" | "video";
  sourceUrl: string;
  sourceSha256?: string | null;
  // Server-owned visual reference required by Stage 6; browser blob URLs are preview-only.
  stage6VisualRef?: string | null;
  // V1 Stage 6 uses one canonical narration track per rendered video.
  videoNarrationSlot?: "FEMALE" | "MALE" | null;
  productionRecipeId?: "QUOTE_CINEMATIC_V1" | null;
  productionRecipeVersion?: "1.0" | null;
  productionStatus?: ProductionStatus;
  productionInputFingerprint?: string | null;
  productionNarrationSlot?: "FEMALE" | "MALE" | null;
  productionVisualBrief?: VisualBrief | null;
  productionFinalAssetId?: string | null;
  productionFailureCode?: string | null;
  productionFailureMessage?: string | null;
  rawOcr: string;
  cleanText: string;
  coreMeaning: string;
  scripts: ScriptVariants;
  femaleVoice: VoiceSlot;
  maleVoice: VoiceSlot;
  videoStatus: "PENDING" | "RENDERING" | "READY" | "FAILED";
  videoUrlOrRef?: string | null;
  videoProvider?: string | null;
  videoEngine?: string | null;
  videoProviderTaskId?: string | null;
  videoProcessRunCount?: number;
  videoLastProcessedAt?: string | null;
  videoLastLatencyMs?: number | null;
  videoProviderMimeType?: string | null;
  videoProviderFilename?: string | null;
  videoFileSizeBytes?: number | null;
  videoDurationMs?: number | null;
  videoWidth?: number | null;
  videoHeight?: number | null;
  videoFrameRate?: number | null;
  videoHasAudio?: boolean | null;
  videoFailureCode?: string | null;
  videoFailureMessage?: string | null;
  videoEstimatedCost?: number | null;
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

export interface VideoGenerationRequest {
  contentId: string;
  jobStatus: JobStatus;
  visualRef: string;
  voiceSourceTextSnapshot: string;
  language: string;
  femaleAudioStatus: "GENERATED";
  maleAudioStatus: "GENERATED";
  femaleAudioRef: string;
  maleAudioRef: string;
  narrationSlot: "FEMALE" | "MALE";
  sourceSha256: string;
  videoProcessRunCount: number;
}

export interface VideoGenerationResult {
  status: "READY" | "FAILED";
  provider: string;
  engine: string;
  providerTaskId?: string | null;
  videoUrlOrRef?: string | null;
  mimeType?: string | null;
  filename?: string | null;
  fileSizeBytes?: number | null;
  durationMs?: number | null;
  width?: number | null;
  height?: number | null;
  frameRate?: number | null;
  hasAudio?: boolean | null;
  latencyMs?: number | null;
  processedAt?: string | null;
  failureCode?: string | null;
  failureMessage?: string | null;
}
